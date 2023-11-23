import { FastifyRequest } from 'fastify';
import { ApiResponse, IInvoice, PaginateResult } from '../../utils/interface';
import { InvoiceService } from './invoice.service';

export class InvoiceController {
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

  static async updateInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await InvoiceService.updateInvoice(request);
  }

  static async deleteInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await InvoiceService.deleteInvoice(request);
  }

  static async sendInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await InvoiceService.sendInvoice(request);
  }

  static async getInvoiceStatistics(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await InvoiceService.getInvoiceStatistics(request);
  }

  static async findInvoice(
    request: FastifyRequest
  ): Promise<ApiResponse<IInvoice>> {
    return await InvoiceService.findInvoice(request);
  }
}
