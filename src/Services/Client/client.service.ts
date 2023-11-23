import {
  ApiResponse,
  IClient,
  IInvoice,
  IInvoiceItem,
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
      const totalIssuedInvoices = clientData.invoices.length;
      const totalPaidInvoices = clientData.invoices.filter((invoice) => {
        return invoice.status === 'PAID';
      }).length;
      const totalPendingInvoices = clientData.invoices.filter((invoice) => {
        return invoice.status === 'SENT';
      }).length;
      const totalOverdueInvoices = clientData.invoices.filter((invoice) => {
        return invoice.status === 'OVERDUE';
      }).length;
      const data = {
        ...clientData,
        totalIssuedInvoices,
        totalPaidInvoices,
        totalPendingInvoices,
        totalOverdueInvoices,
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
          invoices: {
            select: {
              invoiceItems: true,
            },
          },
        },
        take: pageSize,
        skip: pageCursor ? 1 : undefined,
        cursor: pageCursor,
      });
      const data = clients.map((client) => {
        const totalIssuedInvoices = client.invoices.length;
        const totalPurchasedItems = client.invoices.reduce(
          (acc: number, curr: any) => {
            return acc + curr.invoiceItems.length;
          },
          0
        );
        delete client.invoices;
        return {
          ...client,
          totalIssuedInvoices,
          totalPurchasedItems,
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

  static async updateClient(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const vendor = request.user as IVendor;
      const clientData = request.body as IClient;
      const { id: clientId } = request.params as { id: string };
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          vendorId: vendor.id,
          isDeleted: false,
        },
      });
      if (!client) return new NotFoundError(Message.CLIENT_NOT_FOUND);
      await prisma.client.update({
        where: {
          id: clientId,
        },
        data: {
          ...clientData,
        },
      });
      return new SuccessResponse(Message.CLIENT_UPDATED);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async deleteClient(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const vendor = request.user as IVendor;
      const { id: clientId } = request.params as { id: string };
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          vendorId: vendor.id,
          isDeleted: false,
        },
      });
      if (!client) return new NotFoundError(Message.CLIENT_NOT_FOUND);
      await prisma.client.update({
        where: {
          id: clientId,
        },
        data: {
          isDeleted: true,
        },
      });
      return new SuccessResponse(Message.CLIENT_DELETED);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }
}
