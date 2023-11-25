import { FastifyRequest } from 'fastify';
import { ApiResponse, IVendor } from '../../utils/interface';
import { VendorService } from './vendor.service';

export class VendorController {
  static async getVendors(
    request: FastifyRequest
  ): Promise<ApiResponse<IVendor[]>> {
    return await VendorService.getVendors(request);
  }

  static async getVendor(
    request: FastifyRequest
  ): Promise<ApiResponse<IVendor>> {
    return await VendorService.getVendor(request);
  }

  static async getActivityLogs(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await VendorService.getActivityLogs(request);
  }
}

// Client Management Methods:

// POST /clients: Create a new client.
// GET /clients: Get a list of all clients for a vendor.
// GET /clients/{id}: Get details of a specific client.
// PUT /clients/{id}: Update details of a specific client.
// DELETE /clients/{id}: Delete a specific client.
// Invoice Management Methods:

// POST /invoices: Create a new invoice for a client.
// GET /invoices: Get a list of all invoices for a vendor.
// GET /invoices/{id}: Get details of a specific invoice.
// PUT /invoices/{id}: Update details of a specific invoice (like adding items, changing quantity, etc.).
// DELETE /invoices/{id}: Delete a specific invoice.
// Payment Management Methods:

// POST /payments: Record a new payment for an invoice.
// GET /payments: Get a list of all payments for a vendor.
// GET /payments/{id}: Get details of a specific payment.
// PUT /payments/{id}: Update details of a specific payment.
// DELETE /payments/{id}: Delete a specific payment.
