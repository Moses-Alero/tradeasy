import { FastifyRequest } from 'fastify';
import { handleDBError } from '../../utils/errorHandler';
import Flutterwave from 'flutterwave-node-v3';
import ConflictError from '../../utils/errors/conflictError';
import NotFoundError from '../../utils/errors/notFoundError';
import InternalServerError from '../../utils/errors/internalServerError';
import bcrypt from 'bcryptjs';
import ValidationError from '../../utils/errors/validationError';
import type {
  ApiResponse,
  IAccountInfo,
  IBankAccountInfo,
  IBankAccountResponse,
  IBankData,
  IBankResponse,
  IFlutterwaveInputPayload,
  IFlutterwaveTransaction,
  IPagination,
  ISetTransactionPinPayload,
  ITransaction,
  IVendor,
  IWithdraw,
  InputParamsObject,
  PaginateResult,
  PaginationInputQuery,
} from '../../utils/interface';
import { prisma } from '../../utils/prisma';
import { Message } from '../../utils/response';
import SuccessResponse from '../../utils/response/successResponse';
import { STANDARD } from '../../utils/constants/constant';
import { paginate } from '../../utils/paginate';
import { environment } from '../../utils/config/environment';
import axios from 'axios';
import APIGateway from '../../utils/axios';

const {
  flutterwave: { publicKey: PUBLIC_KEY, secretKey: SECRET_KEY },
} = environment;

export class WalletService {
  static flutterwave = new Flutterwave(PUBLIC_KEY, SECRET_KEY);

  static generateTransactionReference() {
    const date = new Date();
    const timestamp = date.getTime();
    return 'FLW-TRE-' + timestamp;
  }

  static async createUserWallet(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const { id: vendorId } = request.user as IVendor;
      const walletFound = await prisma.wallet.findFirst({
        where: {
          vendorId,
        },
      });

      if (walletFound) {
        return new ConflictError(Message.WALLET_EXISTS);
      }

      await prisma.wallet.create({
        data: {
          vendorId,
          balance: 0,
        },
      });
      return new SuccessResponse(Message.USER_WALLET_CREATED);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async transactionHistory(
    request: FastifyRequest
  ): Promise<ApiResponse<PaginateResult<ITransaction[]>>> {
    try {
      const vendor = request.user as IVendor;
      const payload = request.query as IPagination;
      const currentPage = parseInt(payload?.pageNumber || '1');
      const limit = parseInt(payload.pageSize || '20');
      const skip = limit * (currentPage - 1);

      const totalCount = await prisma.transaction.count({
        where: { vendorId: vendor.id },
      });

      const pageSize = Number(limit);
      const totalPages = Math.ceil(totalCount / limit);

      const hasPrevious = currentPage > 1 && totalPages > 1;
      const hasNext = currentPage < totalPages;
      const result = (await prisma.transaction.findMany({
        where: {
          vendorId: vendor.id,
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          currency: true,
          type: true,
          status: true,
        },
        take: pageSize,
        skip,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })) as ITransaction[];
      const data = paginate(result, currentPage, limit, hasNext, totalCount);
      if (data instanceof NotFoundError)
        return new NotFoundError(Message.NO_RESOURCE);
      return new SuccessResponse(
        Message.TRANSACTION_HISTORY_FETCHED,
        STANDARD.SUCCESS,
        data
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async setTransactionPin(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    const vendor = request.user as IVendor;
    const { pin } = request.body as InputParamsObject<string>;
    try {
      const payload: ISetTransactionPinPayload = {
        pin,
      };
      if (vendor.transactionPin)
        return new ConflictError(Message.USER_HAS_TRANSACTION_PIN);

      const pinHash = bcrypt.hashSync(payload.pin, 10);

      await prisma.vendor.update({
        where: {
          id: vendor.id,
        },
        data: {
          transactionPin: pinHash,
        },
      });

      return new SuccessResponse(Message.USER_TRANSACTION_PIN_SET);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async verifyTransactionPin(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    const vendor = request.user as IVendor;
    const { pin } = request.body as InputParamsObject<string>;
    try {
      const payload: ISetTransactionPinPayload = {
        pin,
      };
      if (!vendor.transactionPin)
        return new ValidationError(Message.NO_TRANSACTION_PIN);

      const isPinValid = bcrypt.compareSync(
        payload.pin,
        vendor.transactionPin as string
      );

      if (!isPinValid)
        return new ValidationError(Message.INCORRECT_TRANSACTION_PIN);

      return new SuccessResponse(Message.TRANSACTION_PIN_VERIFIED);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  // Might have to do a complete re-write of this function

  static async flutterwaveWebhook(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    const headers = request.headers as InputParamsObject<string>;
    const payload = request.body as IFlutterwaveInputPayload;

    try {
      // If you specified a secret hash, check for the signature
      const secretHash = environment.flutterwave.verifyHash;

      const signature = headers['verif-hash'];

      if (!signature || signature !== secretHash) {
        console.log(Message.SIGNATURE_MISMATCH);
        return new ConflictError(Message.SIGNATURE_MISMATCH);
      }
      console.log(request.body['event.type']);

      const eventType = request.body['event.type'];
      if (eventType === 'CARD_TRANSACTION') {
        await this.processPayments(eventType);
      }
      // find invoice

      // verify the transaction from flutterwave again
      const verifiedTransaction = await this.verifyPaymentTransaction({
        id: payload?.id?.toString(),
      });

      console.log(verifiedTransaction);

      // check if it's successful and the amount is correct along with the transaction reference
      if (
        verifiedTransaction?.status === 'successful' &&
        verifiedTransaction?.amount === payload?.amount &&
        verifiedTransaction?.tx_ref === payload?.txRef
      ) {
        // Get the transaction from database
        const transaction = await prisma.transaction.findFirst({
          where: {
            reference_id: payload?.txRef,
          },
        });

        // Get the user that owns the transaction
        const vendor = await prisma.vendor.findFirst({
          where: {
            email:
              verifiedTransaction?.customer?.email ||
              verifiedTransaction?.meta?.email,
          },
        });

        // check if there is user
        if (vendor) {
          // check if there is transaction on the database
          if (!transaction) {
            // get user wallet
            const vendorWallet = await prisma.wallet.findFirst({
              where: {
                vendorId: vendor.id,
              },
            });

            // perform prisma transaction
            await prisma.$transaction(async (tx) => {
              // Update user wallet
              if (vendorWallet) {
                await tx.wallet.update({
                  where: {
                    id: vendorWallet?.id,
                  },
                  data: {
                    balance: { increment: verifiedTransaction?.amount || 0 },
                  },
                });
              } else {
                await tx.wallet.create({
                  data: {
                    balance: verifiedTransaction?.amount || 0,
                    vendorId: vendor.id,
                  },
                });
              }

              // create transaction
              await tx.transaction.create({
                data: {
                  reference_id: verifiedTransaction?.tx_ref,
                  amount: verifiedTransaction.amount,
                  vendorId: vendor?.id,
                  type: 'CREDIT',
                  status: 'COMPLETED',
                },
              });
            });
            return new SuccessResponse(Message.webhookDataReceived);
          } else if (transaction?.status === 'PENDING') {
            // get user wallet
            const vendorWallet = await prisma.wallet.findFirst({
              where: {
                vendorId: vendor.id,
              },
            });
            // perform prisma transaction
            await prisma.$transaction(async (tx) => {
              // Update user wallet
              if (vendorWallet) {
                await tx.wallet.update({
                  where: {
                    id: vendorWallet?.id,
                  },
                  data: {
                    balance: { increment: verifiedTransaction?.amount || 0 },
                  },
                });
              } else {
                await tx.wallet.create({
                  data: {
                    balance: verifiedTransaction?.amount || 0,
                    vendorId: vendor.id,
                  },
                });
              }

              // update transaction status
              await tx.transaction.update({
                where: {
                  id: transaction.id,
                },
                data: {
                  status: 'COMPLETED',
                },
              });
            });
            console.log(Message.webhookDataReceived);
            return new SuccessResponse(Message.webhookDataReceived);
          } else {
            console.log(Message.WRONG_REQUEST);
            return new ValidationError(Message.WRONG_REQUEST);
          }
        } else {
          console.log(Message.USER_NOT_FOUND);
          return new NotFoundError(Message.USER_NOT_FOUND);
        }
      } else {
        console.log(Message.GENERAL_ERROR);

        return new ValidationError(Message.GENERAL_ERROR);
      }
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async verifyPaymentTransaction(payload: {
    id: string;
  }): Promise<IFlutterwaveTransaction> {
    const response = await this.flutterwave.Transaction.verify(payload);
    return response.data;
  }

  static async getBanks(
    request: FastifyRequest
  ): Promise<ApiResponse<IBankData[]>> {
    try {
      const apiGateway = new APIGateway(axios);

      const options = {
        method: apiGateway.HTTPMethods.GET,
        url: 'https://api.flutterwave.com/v3/banks/NG',
        headers: {
          Authorization: `Bearer ${environment.flutterwave.secretKey}`,
        },
      };

      const response = await apiGateway.request(
        options.method,
        options.url,
        null,
        null,
        options.headers
      );
      const bankResponse = response.data as IBankResponse;
      //sort banks alphabetically
      const listOfBanks = bankResponse.data;
      const data = listOfBanks.sort((a: any, b: any) => {
        return a.name.localeCompare(b.name);
      });

      return new SuccessResponse(
        Message.BANK_LIST_FETCHED,
        STANDARD.SUCCESS,
        data
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async verifyBankAccount(
    request: FastifyRequest
  ): Promise<ApiResponse<IAccountInfo>> {
    try {
      const { accountNumber, bankCode } = request.body as IBankAccountInfo;
      const details = {
        account_number: accountNumber, // This is the account number to be verified
        account_bank: bankCode, // This is the bank code of the account
      };

      const accountInfo = (await this.flutterwave.Misc.verify_Account(
        details
      )) as IBankAccountResponse;

      if (!accountInfo)
        return new ValidationError(Message.INVALID_ACCOUNT_NUMBER);
      if (accountInfo.status === 'error')
        return new ValidationError(accountInfo.message);

      const data = accountInfo.data;
      return new SuccessResponse(
        Message.ACCOUNT_FETCHED,
        STANDARD.SUCCESS,
        data
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async withdrawToBank(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const { id: vendorId } = request.user as IVendor;
      const password = request.body['password'];
      const vendor = await prisma.vendor.findUnique({
        where: {
          id: vendorId,
        },
      });
      const data = request.body as IWithdraw;
      const isMatch = await bcrypt.compare(password, vendor.password);
      if (!isMatch) return new ValidationError(Message.INCORRECT_PASSWORD);
      let vendorWallet = await prisma.wallet.findFirst({
        where: {
          vendorId,
        },
      });
      if (!vendorWallet) {
        vendorWallet = await prisma.wallet.create({
          data: {
            vendorId,
          },
        });
      }

      if (Number(data.amount) < 100)
        return new ValidationError(
          Message.MINIMUM_WITHDRAWAL.replace('<AMOUNT>', '100')
        );

      if (Number(data.amount) > Number(vendorWallet.balance)) {
        return new ValidationError(Message.INSUFFICIENT_FUND);
      }
      const txn_ref = this.generateTransactionReference();
      const details = {
        account_bank: data.bankCode,
        account_number: data.accountNumber,
        amount: data.amount,
        narration: 'TradEazy WithDrawal',
        currency: 'NGN',
        reference: txn_ref,
      };

      const response = await this.flutterwave.Transfer.initiate(details);
      console.log(response);
      if (response.status === 'error') throw new Error(response.message);

      if (
        response.status === 'success' &&
        (response.data.status === 'SUCCESSFUL' ||
          response.data.status === 'NEW')
      ) {
        await prisma.$transaction(async (tx) => {
          // REMOVE FROM HERE
          await tx.wallet.update({
            where: { id: vendorWallet.id },
            data: {
              balance: { decrement: Number(data.amount) },
              totalWithdrawal: { increment: Number(data.amount) },
            },
          });
          await tx.transaction.create({
            data: {
              reference_id: txn_ref,
              amount: data.amount,
              type: 'DEBIT',
              message: 'Money Withdrawal',
              vendorId,
            },
          });
          await tx.activityLog.create({
            data: {
              action: 'WITHDRAWAL',
              message: Message.PROCESSING_WITHDRAWAL,
              vendorId,
            },
          });
        });
        return new SuccessResponse(Message.PROCESSING_TRANSACTION);
      }
    } catch (e) {
      console.log(e);
      request.log.error(e);
      handleDBError(e);
      return new InternalServerError();
    }
  }

  static async processWithdrawals(eventType: string) {}

  static async processPayments(payload: any) {
    const verifiedTransaction = await this.verifyPaymentTransaction({
      id: payload?.id?.toString(),
    });
  }
}
