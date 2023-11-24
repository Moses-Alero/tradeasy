import { FastifyRequest } from 'fastify';
import { handleDBError } from '../../utils/errorHandler';
import ConflictError from '../../utils/errors/conflictError';
import InternalServerError from '../../utils/errors/internalServerError';
import bcrypt from 'bcryptjs';
import ValidationError from '../../utils/errors/validationError';
import {
  ApiResponse,
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
import { STANDARD } from 'utils/constants/constant';
import { paginate } from 'utils/paginate';

export class WalletService {
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
}
