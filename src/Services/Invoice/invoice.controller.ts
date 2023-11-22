import { FastifyRequest } from 'fastify';
import { ApiResponse, IInvoice, PaginateResult } from '../../utils/interface';
import { InvoiceService } from './invoice.service';

export class InvoiceContrller {
  static async createInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await InvoiceService.createInvoice(request);
  }
  static async getInvoice(request: FastifyRequest): Promise<ApiResponse<void>> {
    return await InvoiceService.getInvoice(request);
  }

  static async getAllInvoices(
    request: FastifyRequest
  ): Promise<ApiResponse<PaginateResult<IInvoice[]>>> {
    return await InvoiceService.getAllInvoices(request);
  }
}
