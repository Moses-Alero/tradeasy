import { FastifyRequest } from 'fastify';
import { handleDBError } from '../../utils/errorHandler';
import Flutterwave from 'flutterwave-node-v3';
import ConflictError from '../../utils/errors/conflictError';
import NotFoundError from '../../utils/errors/notFoundError';
import InternalServerError from '../../utils/errors/internalServerError';
import bcrypt from 'bcryptjs';
import ValidationError from '../../utils/errors/validationError';
import {
  ApiResponse,
  IFlutterwaveInputPayload,
  IFlutterwaveTransaction,
  ISetTransactionPinPayload,
  ITransaction,
  IVendor,
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
    const vendor = request.user as IVendor;
    const { limit = 10, cursor } = request.query as PaginationInputQuery;
    try {
      const pageCursor = cursor
        ? {
            id: atob(cursor),
          }
        : undefined;

      const pageSize = Number(limit);
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
        cursor: pageCursor,
        skip: pageCursor ? 1 : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })) as ITransaction[];
      const data = paginate(result, limit);
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
      // const secretHash = environment.flutterwave.verifyHash;

      // const signature = atob(headers['verif-hash']);

      // if (!signature || signature !== secretHash) {
      //   return new ConflictError(Message.SIGNATURE_MISMATCH);
      // }

      // find invoice
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: payload?.invoiceId,
        },
        select: {},
      });
      // verify the transaction from flutterwave again
      const verifiedTransaction = await this.verifyPaymentTransaction({
        id: payload?.id?.toString(),
      });

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
            return new SuccessResponse(Message.webhookDataReceived);
          } else {
            return new ValidationError(Message.WRONG_REQUEST);
          }
        } else {
          return new NotFoundError(Message.USER_NOT_FOUND);
        }
      } else {
        return new ValidationError(Message.GENERAL_ERROR);
      }
    } catch (e) {}
  }

  static async verifyPaymentTransaction(payload: {
    id: string;
  }): Promise<IFlutterwaveTransaction> {
    const response = await this.flutterwave.Transaction.verify(payload);
    return response.data;
  }

  static async getBankList(request: FastifyRequest): Promise<ApiResponse<any>> {
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

      return new SuccessResponse(
        Message.BANK_LIST_FETCHED,
        STANDARD.SUCCESS,
        response.data
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }
}
