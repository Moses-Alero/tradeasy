// Handles all wallet related services
// Compare this snippet from src/Services/Wallet/wallet.routes.ts:
// Warning: This code is ugly AF and needs to be refactored, but... it works
// STUTERN people, the code is yours to refactor after all na una organize hackathon

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
  ICardTransaction,
  IFlutterwaveInputPayload,
  IFlutterwaveTransaction,
  IPagination,
  ISetTransactionPinPayload,
  ITransaction,
  IVendor,
  IWithDrawalData,
  IWithDrawalResponse,
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
    const payload = request.body as ICardTransaction | IWithDrawalResponse;

    try {
      // If you specified a secret hash, check for the signature
      const secretHash = environment.flutterwave.verifyHash;

      const signature = headers['verif-hash'];

      if (!signature || signature !== secretHash) {
        console.log(Message.SIGNATURE_MISMATCH);
        return new ConflictError(Message.SIGNATURE_MISMATCH);
      }
      console.log(request.body['event.type']);

      // when user pays for invoice with card
      // only card transaction is supported for now
      const eventType = request.body['event.type'];
      if (eventType === 'CARD_TRANSACTION') {
        await this.processPayments(payload as ICardTransaction);
      }
      //
      if (eventType === 'Transfer') {
        const { transfer: transferInfo } = payload as IWithDrawalResponse;
        console.log(payload);
        await this.processWithdrawals(transferInfo as IWithDrawalData);
      }
      // verify the transaction from flutterwave again
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
        amount: Number(data.amount),
        currency: 'NGN',
        narration: 'Tradeazy Withdrawal',
        reference: txn_ref,
        callback_url: `${environment.apiUri}/wallet/webhook`,
        debit_currency: 'NGN',
        meta: [
          {
            sender: 'Tradeazy',
            first_name: vendor.firstName,
            last_name: vendor.lastName,
            email: vendor.email,
            beneficiary_country: 'NG',
            mobile_number: '+2348131133933',
            merchant_name: vendor.businessName,
          },
        ],
      };

      const response = await this.flutterwave.Transfer.initiate(details);
      console.log('Transfer Response->:', response);
      if (response.status === 'error') throw new Error(response.message);

      if (
        response.status === 'success' &&
        (response.data.status === 'SUCCESSFUL' ||
          response.data.status === 'NEW')
      ) {
        await prisma.$transaction(async (tx) => {
          // create transaction
          await tx.transaction.create({
            data: {
              reference_id: txn_ref,
              amount: data.amount,
              type: 'DEBIT',
              status: 'PENDING',
              message: 'Money Withdrawal',
              vendorId,
              transacterName: vendor.businessName,
              transacterEmail: vendor.email,
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

  static async processWithdrawals(payload: IWithDrawalData) {
    // verify the transaction from flutterwave again
    const transaction = await prisma.transaction.findFirst({
      where: {
        reference_id: payload.reference,
      },
      select: {
        id: true,
        vendorId: true,
      },
    });

    if (!transaction) return new NotFoundError(Message.TRANSACTION_NOT_FOUND);
    console.log('Payloadddd>>>>>>', payload);

    if (payload.status !== 'FAILED' && payload.status !== 'PENDING') {
      await prisma.$transaction(async (tx) => {
        // create transaction
        await tx.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            type: 'DEBIT',
            status: 'COMPLETED',
            message: 'Money Withdrawal',
          },
        });
        //update wallet
        await tx.wallet.update({
          where: {
            vendorId: transaction.vendorId,
          },
          data: {
            balance: { decrement: Number(payload.amount) },
            totalWithdrawal: { increment: Number(payload.amount) },
          },
        });
        await tx.activityLog.create({
          data: {
            action: 'WITHDRAWAL',
            message: Message.MONEY_WITHDRAWN,
            vendorId: transaction.vendorId,
          },
        });
      });
      return new SuccessResponse(Message.NGN_TRANSACTION_SUCCESSFUL);
    } else {
      await prisma.$transaction(async (tx) => {
        // create transaction
        await tx.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            type: 'DEBIT',
            status: 'FAILED',
            message: 'Money Withdrawal',
          },
        });
        await tx.activityLog.create({
          data: {
            action: 'WITHDRAWAL',
            message: Message.WITHDRAWAL_FAILED,
            vendorId: transaction.vendorId,
          },
        });
      });
      return new SuccessResponse(Message.WITHDRAWAL_FAILED);
    }
  }

  static async processPayments(payload: ICardTransaction) {
    // verify the transaction from flutterwave again

    const verifiedTransaction = await this.verifyPaymentTransaction({
      id: payload.id.toString(),
    });
    console.log(payload);
    // check if it's successful and the amount is correct along with the transaction reference
    if (
      verifiedTransaction.status === 'successful' &&
      verifiedTransaction.amount === payload?.amount &&
      verifiedTransaction.tx_ref === payload?.txRef
    ) {
      const invoiceId = payload.txRef.replace('FLW-TRE-', '');

      // Get the transaction from database
      const transaction = await prisma.transaction.findFirst({
        where: {
          reference_id: verifiedTransaction.tx_ref,
        },
        select: {
          id: true,
          vendorId: true,
        },
      });
      // if the transaction exists (for what ever reason it should exist e.g. first transaction failed)
      // it shouldn't happen but you can't be too careful with people's money lol
      if (transaction) {
        await prisma.$transaction(async (tx) => {
          // find invoice
          const invoice = await tx.invoice.findUnique({
            where: { id: invoiceId },
            select: {
              issuedTo: {
                select: {
                  fullname: true,
                  email: true,
                },
              },
              issuedBy: {
                select: {
                  id: true,
                  wallet: true,
                },
              },
            },
          });
          if (!invoice) return new NotFoundError(Message.INVOICE_NOT_FOUND);
          if (transaction.vendorId !== invoice.issuedBy.id) return;
          // update transaction status to completed
          await tx.transaction.update({
            where: {
              id: transaction.id,
              reference_id: verifiedTransaction.tx_ref,
            },
            data: {
              type: 'CREDIT',
              status: 'COMPLETED',
              transacterName: invoice.issuedTo.fullname,
              transacterEmail: invoice.issuedTo.email,
            },
          });

          await tx.wallet.update({
            where: {
              vendorId: invoice.issuedBy.id,
            },
            data: {
              balance: { increment: verifiedTransaction.amount },
              totalCredit: { increment: verifiedTransaction.amount },
            },
          });

          // update invoice status to paid
          await tx.invoice.update({
            where: {
              id: invoiceId,
            },
            data: {
              status: 'PAID',
            },
          });

          // create activity log
          await tx.activityLog.create({
            data: {
              action: 'PAYMENT',
              message: Message.PAYMENT_RECEIVED.replace(
                '<USER>',
                invoice.issuedTo.fullname
              ),
              vendorId: invoice.issuedBy.id,
            },
          });
        });
      }

      // this should be abstracted but LMAO I'm tired
      await prisma.$transaction(async (tx) => {
        // find invoice
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          select: {
            issuedTo: {
              select: {
                fullname: true,
                email: true,
              },
            },
            issuedBy: {
              select: {
                id: true,
                wallet: true,
              },
            },
          },
        });
        if (!invoice) return new NotFoundError(Message.INVOICE_NOT_FOUND);

        // create transaction
        await tx.transaction.create({
          data: {
            reference_id: verifiedTransaction.tx_ref,
            amount: verifiedTransaction.amount,
            vendorId: invoice.issuedBy.id,
            type: 'CREDIT',
            status: 'COMPLETED',
            transacterName: invoice.issuedTo.fullname,
            transacterEmail: invoice.issuedTo.email,
          },
        });
        if (!invoice.issuedBy.wallet) {
          await tx.wallet.create({
            data: {
              vendorId: invoice.issuedBy.id,
            },
          });
        }
        // update wallet
        await tx.wallet.update({
          where: {
            vendorId: invoice.issuedBy.id,
          },
          data: {
            balance: { increment: verifiedTransaction.amount },
            totalCredit: { increment: verifiedTransaction.amount },
          },
        });

        // update invoice status to paid
        await tx.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            status: 'PAID',
          },
        });

        // create activity log
        await tx.activityLog.create({
          data: {
            action: 'PAYMENT',
            message: Message.PAYMENT_RECEIVED.replace(
              '<USER>',
              invoice.issuedTo.fullname
            ),
            vendorId: invoice.issuedBy.id,
          },
        });
      });
    }
  }

  static async getPaymentHistory(
    request: FastifyRequest
  ): Promise<ApiResponse<any>> {
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

      const transactions = await prisma.transaction.findMany({
        where: {
          vendorId: vendor.id,
        },
        take: pageSize,
        skip,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          amount: true,
          createdAt: true,
          currency: true,
          type: true,
          status: true,
          transacterName: true,
          transacterEmail: true,
        },
      });

      const data = paginate(
        transactions,
        currentPage,
        limit,
        !hasNext,
        totalCount
      );
      if (data instanceof NotFoundError)
        return new NotFoundError(Message.NO_RESOURCE);
      return new SuccessResponse(
        Message.TRANSACTION_HISTORY_FETCHED,
        STANDARD.SUCCESS,
        data
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }
}
