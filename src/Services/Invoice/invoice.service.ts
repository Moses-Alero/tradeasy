import { FastifyRequest } from 'fastify';
import { STANDARD } from '../../utils/constants/constant';
import { handleDBError } from '../../utils/errorHandler';
import InternalServerError from '../../utils/errors/internalServerError';
import type {
  ApiResponse,
  IInvoice,
  IInvoiceStatistics,
  IPagination,
  IVendor,
  PaginateResult,
  PaginationInputQuery,
} from '../../utils/interface';
import { prisma } from '../../utils/prisma';
import { Message } from '../../utils/response';
import SuccessResponse from '../../utils/response/successResponse';
import NotFoundError from '../../utils/errors/notFoundError';
import { paginate } from '../../utils/paginate';
import { Mailer } from '../../utils/helper/mailer.helper';
import {
  invoiceEmailTemplate,
  invoicePaymentTemplate,
} from '../../utils/templates/invoice.template';

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
    const invoiceBody = invoiceEmailTemplate(invoice);
    const mailParams = {
      To: invoice.issuedTo.email,
      Subject: 'Invoice',
      Body: invoiceBody,
    };
    Mailer.sendEmail(mailParams);
  }

  static async createInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<IInvoice>> {
    try {
      const vendor = request.user as IVendor;
      const invoiceData = request.body as IInvoice;
      const clientEmail = request.body['clientEmail'];
      const invoiceNo = this.generateInvoiceNumber(vendor.businessName);
      const client = await prisma.client.findFirst({
        where: {
          email: clientEmail,
          vendorId: vendor.id,
          isDeleted: false,
        },
      });
      if (!client) return new NotFoundError(Message.CLIENT_NOT_FOUND);
      //if not specified due date is automatically set to 7 days later
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo,
          createdAt: new Date(),
          description: invoiceData.description ?? undefined,
          totalAmount: invoiceData.totalAmount,
          dueDate,
          status: 'SENT',
          vendorId: vendor.id,
          clientId: client.id,
        },
      });
      // create invoice Items
      await prisma.invoiceItem.createMany({
        data: invoiceData.invoiceItems.map((item) => {
          return {
            ...item,
            invoiceId: invoice.id,
            clientId: client.id,
          };
        }),
      });
      await this.generateAndSendInvoice(invoice.id);
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
          issuedTo: {
            select: {
              fullname: true,
              email: true,
              billingAddress: true,
              companyName: true,
              paymentType: true,
            },
          },
          invoiceItems: {
            select: {
              item: true,
              quantity: true,
              unitPrice: true,
            },
          },
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
      const vendor = request.user as IVendor;
      const payload = request.query as IPagination;

      const currentPage = parseInt(payload?.pageNumber || '1');
      const limit = parseInt(payload?.pageSize || '20');
      const skip = limit * (currentPage - 1);
      const pageSize = Number(limit);

      const totalCount = await prisma.invoice.count({
        where: {
          vendorId: vendor.id,
        },
      });

      const totalPages = Math.ceil(totalCount / limit);
      const hasPrevious = currentPage > 1 && totalPages > 1;
      const hasNext = currentPage < totalPages;
      console.log(totalPages);
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
        skip,
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
      console.log(data);

      const result = paginate(data, currentPage, limit, !hasNext, totalCount);
      if (result instanceof NotFoundError)
        return new NotFoundError(Message.NO_RESOURCE_FOUND);
      return new SuccessResponse(
        Message.INVOICE_FETCHED,
        STANDARD.SUCCESS,
        result
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
          description: invoiceData.description ?? undefined,
          totalAmount: invoiceData.totalAmount,
          status: invoiceData.status,
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
  ): Promise<ApiResponse<IInvoiceStatistics>> {
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
          invoiceItems: {
            select: {
              item: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
      });

      return invoice as any;
    } catch (error) {
      throw error;
    }
  }

  static async sendReminderForOverdueInvoices(
    request: FastifyRequest
  ): Promise<void> {
    try {
      const vendor = request.user as IVendor;
      const invoices = await prisma.invoice.findMany({
        where: {
          vendorId: vendor.id,
          status: 'OVERDUE',
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
          invoiceItems: true,
        },
      });
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async findInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<IInvoice>> {
    try {
      const vendor = request.user as IVendor;
      const payload = request.query as IPagination;
      const searchParams = request.query['searchParams'];
      const currentPage = parseInt(payload?.pageNumber || '1');
      const limit = parseInt(payload?.pageSize || '20');
      const skip = limit * (currentPage - 1);

      const totalCount = await prisma.invoice.count({
        where: {
          OR: [
            {
              issuedTo: {
                fullname: {
                  contains: searchParams,
                  mode: 'insensitive',
                },
              },
            },
            {
              invoiceNo: {
                contains: searchParams,
                mode: 'insensitive',
              },
            },
          ],
          vendorId: vendor.id,
          isDeleted: false,
        },
      });

      const pageSize = Number(limit);
      const totalPages = Math.ceil(totalCount / limit);
      const hasPrevious = currentPage > 1 && totalPages > 1;
      const hasNext = currentPage < totalPages;
      const emptyValue = paginate([], currentPage, limit, !hasNext, totalCount);
      if (!searchParams || searchParams === '')
        return new SuccessResponse(
          Message.INVOICE_SEARCH_RESULT,
          STANDARD.SUCCESS,
          emptyValue
        );

      const invoices = await prisma.invoice.findMany({
        where: {
          OR: [
            {
              issuedTo: {
                fullname: {
                  contains: searchParams,
                  mode: 'insensitive',
                },
              },
            },
            {
              invoiceNo: {
                contains: searchParams,
                mode: 'insensitive',
              },
            },
          ],
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
        skip,
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
      const result = paginate(data, currentPage, limit, !hasNext, totalCount);
      if (result instanceof NotFoundError)
        return new NotFoundError(Message.NO_RESOURCE_FOUND);
      return new SuccessResponse(
        Message.INVOICE_SEARCH_RESULT,
        STANDARD.SUCCESS,
        result
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }
  static async payForInvoice(
    request: FastifyRequest
  ): Promise<string | ApiResponse<string>> {
    try {
      const vendor = request.user as IVendor;
      const { id: invoiceId } = request.params as { id: string };

      const invoiceExists = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          isDeleted: false,
        },
      });

      if (!invoiceExists) return new NotFoundError(Message.INVOICE_NOT_FOUND);

      const invoice = await this.getInvoiceData(invoiceId);
      const paymentHtml = invoicePaymentTemplate(invoice);

      return paymentHtml;
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }
}
