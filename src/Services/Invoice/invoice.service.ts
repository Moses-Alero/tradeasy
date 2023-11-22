import { FastifyRequest } from 'fastify';
import { STANDARD } from '../../utils/constants/constant';
import { handleDBError } from '../../utils/errorHandler';
import InternalServerError from '../../utils/errors/internalServerError';
import type {
  ApiResponse,
  IInvoice,
  IVendor,
  PaginateResult,
  PaginationInputQuery,
} from '../../utils/interface';
import { prisma } from '../../utils/prisma';
import { Message } from '../../utils/response';
import SuccessResponse from '../../utils/response/successResponse';
import NotFoundError from '../../utils/errors/notFoundError';
import { paginate } from '../../utils/paginate';

export class InvoiceService {
  static generateInvoiceNumber(businessName: string): string {
    // Get the first three letters of the business name
    const prefix = businessName.substring(0, 3).toUpperCase();

    // Get the current date-time in seconds
    const dateTimeInSeconds = Math.floor(Date.now() / 1000);

    // Generate the invoice number
    const invoiceNumber = `INV-${prefix}-${dateTimeInSeconds}`;

    return invoiceNumber;
  }

  static async generateAndSendInvoice(invoiceId: string): Promise<void> {
    // Generate the invoice number
    const invoice = await this.getInvoiceData(invoiceId);
  }

  static async createInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<IInvoice>> {
    try {
      const vendor = request.user as IVendor;
      const invoiceData = request.body as IInvoice;
      const invoiceNumber = this.generateInvoiceNumber(vendor.businessName);
      //if not specified due date is automatically set to 7 days later
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const invoice = await prisma.invoice.create({
        data: {
          ...invoiceData,
          invoiceNo: invoiceNumber,
          dueDate,
          vendorId: vendor.id,
        },
      });
      return new SuccessResponse(
        Message.INVOICE_CREATED,
        STANDARD.SUCCESS,
        invoice
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }

  static async getInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<IInvoice>> {
    try {
      const vendor = request.user as IVendor;
      const { id: invoiceId } = request.params as { id: string };
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          vendorId: vendor.id,
          isDeleted: false,
        },
        select: {
          id: true,
          invoiceNo: true,
          description: true,
          totalAmount: true,
          dueDate: true,
          issuedAt: true,
        },
      });
      if (!invoice) return new NotFoundError(Message.INVOICE_NOT_FOUND);
      return new SuccessResponse(
        Message.INVOICE_FETCHED,
        STANDARD.SUCCESS,
        invoice
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }

  static async getAllInvoices(
    request: FastifyRequest
  ): Promise<ApiResponse<PaginateResult<IInvoice[]>>> {
    try {
      const { limit = 10, cursor } = request.query as PaginationInputQuery;

      const pageCursor = cursor
        ? {
            id: atob(cursor),
          }
        : undefined;

      const pageSize = Number(limit);

      const vendor = request.user as IVendor;
      const invoices = await prisma.invoice.findMany({
        where: {
          vendorId: vendor.id,
          isDeleted: false,
        },
        select: {
          id: true,
          invoiceNo: true,
          description: true,
          totalAmount: true,
          status: true,
          dueDate: true,
          issuedAt: true,
          issuedTo: {
            select: {
              fullname: true,
            },
          },
        },
        take: pageSize,
        cursor: pageCursor,
        skip: pageCursor ? 1 : undefined,
        orderBy: {
          createdAt: 'desc',
        },
      });
      const data = invoices.map((invoice) => {
        return {
          ...invoice,
          issuedTo: invoice.issuedTo.fullname,
        };
      });
      return new SuccessResponse(
        Message.INVOICE_FETCHED,
        STANDARD.SUCCESS,
        paginate(data, limit)
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }

  static async updateInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<IInvoice>> {
    try {
      const vendor = request.user as IVendor;
      const { id: invoiceId } = request.params as { id: string };

      const invoiceExists = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          vendorId: vendor.id,
          isDeleted: false,
        },
      });

      if (!invoiceExists) return new NotFoundError(Message.INVOICE_NOT_FOUND);

      const invoiceData = request.body as IInvoice;
      const invoice = await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          ...invoiceData,
          vendorId: vendor.id,
        },
      });
      return new SuccessResponse(
        Message.INVOICE_UPDATED,
        STANDARD.SUCCESS,
        invoice
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }

  static async getInvoiceStatistics(
    request: FastifyRequest
  ): Promise<ApiResponse<any>> {
    try {
      const [draftInvoices, pendingInvoices, paidInvoices, overDueInvoices] =
        await prisma.$transaction([
          prisma.invoice.count({
            where: {
              status: 'DRAFT',
            },
          }),
          prisma.invoice.count({
            where: {
              status: 'SENT',
            },
          }),
          prisma.invoice.count({
            where: {
              status: 'PAID',
            },
          }),
          prisma.invoice.count({
            where: {
              status: 'OVERDUE',
            },
          }),
        ]);

      const data = {
        draftInvoices,
        pendingInvoices,
        paidInvoices,
        overDueInvoices,
      };

      return new SuccessResponse(
        Message.INVOICE_STATISTICS,
        STANDARD.SUCCESS,
        data
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async deleteInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const vendor = request.user as IVendor;
      const { id: invoiceId } = request.params as { id: string };

      const invoiceExists = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          vendorId: vendor.id,
          isDeleted: false,
        },
      });

      if (!invoiceExists) return new NotFoundError(Message.INVOICE_NOT_FOUND);

      await prisma.invoice.delete({
        where: {
          id: invoiceId,
        },
      });

      return new SuccessResponse(Message.INVOICE_DELETED);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async sendInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const vendor = request.user as IVendor;
      const { id: invoiceId } = request.params as { id: string };

      const invoiceExists = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          vendorId: vendor.id,
          isDeleted: false,
        },
      });

      if (!invoiceExists) return new NotFoundError(Message.INVOICE_NOT_FOUND);

      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: 'SENT',
        },
      });

      return new SuccessResponse(Message.INVOICE_SENT);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async markInvoiceAsPaid(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const vendor = request.user as IVendor;
      const { id: invoiceId } = request.params as { id: string };

      const invoiceExists = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          vendorId: vendor.id,
        },
      });

      if (!invoiceExists) return new NotFoundError(Message.INVOICE_NOT_FOUND);

      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: 'PAID',
        },
      });

      return new SuccessResponse(Message.INVOICE_MARKED_AS_PAID);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async getInvoiceData(invoiceId: string): Promise<Partial<IInvoice>> {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          isDeleted: false,
        },
        select: {
          id: true,
          invoiceNo: true,
          description: true,
          totalAmount: true,
          dueDate: true,
          issuedAt: true,
          issuedTo: {
            select: {
              fullname: true,
              email: true,
              billingAddress: true,
              companyName: true,
              paymentType: true,
            },
          },
          invoiceItem: {
            select: {
              product: true,
            },
          },
        },
      });

      return invoice;
    } catch (error) {
      throw error;
    }
  }
}
