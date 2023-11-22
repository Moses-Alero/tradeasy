import {
  ApiResponse,
  IClient,
  IVendor,
  PaginationInputQuery,
} from './../../utils/interface.d';
import { FastifyRequest } from 'fastify';
import InternalServerError from '../../utils/errors/internalServerError';
import SuccessResponse from '../../utils/response/successResponse';
import { STANDARD } from '../../utils/constants/constant';
import { handleDBError } from '../../utils/errorHandler';
import { prisma } from '../../utils/prisma';
import { Message } from '../../utils/response';
import NotFoundError from '../../utils/errors/notFoundError';
import ConflictError from '../../utils/errors/conflictError';
import { paginate } from '../../utils/paginate';

export class ClientService {
  static async createClient(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    // create client profile to receive invoice
    try {
      const vendor = request.user as IVendor;
      const client = request.body as IClient;
      const clientExists = await prisma.client.findFirst({
        where: {
          email: client.email,
          vendorId: vendor.id,
        },
      });
      if (clientExists) return new ConflictError(Message.CLIENT_EXISTS);
      await prisma.client.create({
        data: {
          ...client,
          vendorId: vendor.id,
        },
      });

      return new SuccessResponse(Message.CLIENT_CREATED);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async getClient(
    request: FastifyRequest
  ): Promise<ApiResponse<IClient>> {
    try {
      const vendor = request.user as IVendor;
      const { id: clientId } = request.params as { id: string };
      const clientData = await prisma.client.findFirst({
        where: {
          id: clientId,
          vendorId: vendor.id,
        },
        select: {
          id: true,
          fullname: true,
          email: true,
          phone: true,
          companyName: true,
          billingAddress: true,
          clientType: true,
          invoices: {
            select: {
              id: true,
              issuedAt: true,
              dueDate: true,
              totalAmount: true,
              status: true,
              invoiceNo: true,
            },
          },
        },
      });
      if (!clientData) return new NotFoundError(Message.CLIENT_NOT_FOUND);
      const totalInvoices = clientData.invoices.length;
      const data = {
        ...clientData,
        totalInvoices,
      };
      return new SuccessResponse(
        Message.CLIENT_FETCHED,
        STANDARD.SUCCESS,
        data
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async getAllClients(
    request: FastifyRequest
  ): Promise<ApiResponse<IClient[]>> {
    try {
      const { limit = 10, cursor } = request.query as PaginationInputQuery;

      const pageCursor = cursor
        ? {
            id: atob(cursor),
          }
        : undefined;

      const pageSize = Number(limit);

      const vendor = request.user as IVendor;
      const clients = await prisma.client.findMany({
        where: {
          vendorId: vendor.id,
        },
        select: {
          id: true,
          fullname: true,
          email: true,
          phone: true,
          companyName: true,
          billingAddress: true,
          clientType: true,
          invoices: true,
        },
        take: pageSize,
        skip: pageCursor ? 1 : undefined,
        cursor: pageCursor,
      });
      const data = clients.map((client) => {
        const totalIssuedInvoices = client.invoices.length;
        delete client.invoices;
        return {
          ...client,
          totalIssuedInvoices,
        };
      });
      return new SuccessResponse(
        Message.CLIENT_FETCHED,
        STANDARD.SUCCESS,
        paginate(data, limit)
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }
}
