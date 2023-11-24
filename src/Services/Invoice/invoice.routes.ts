import { FastifyInstance } from 'fastify';
import { ResponseHandler } from '../../utils/responsehandler';
import { InvoiceController } from './invoice.controller';
import { AuthMiddleware } from '../../middleware/auth.middleware';

export async function invoiceRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/all',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(InvoiceController.getAllInvoices)
  );
  fastify.get(
    '/statistics',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(InvoiceController.getInvoiceStatistics)
  );
  fastify.get(
    '/:id',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(InvoiceController.getInvoice)
  );
  fastify.get(
    '/search',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(InvoiceController.findInvoice)
  );
  fastify.post(
    '/create',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(InvoiceController.createInvoice)
  );
  fastify.post(
    '/update/:id',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(InvoiceController.updateInvoice)
  );
  fastify.post(
    '/send/:id',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(InvoiceController.sendInvoice)
  );
  fastify.get(
    '/pay/:id',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handleHTML(InvoiceController.payForInvoice)
  );
}
