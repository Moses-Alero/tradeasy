import { ResponseHandler } from './../../utils/responsehandler';
import { FastifyInstance } from 'fastify';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { VendorController } from './vendor.controller';

export async function vendorRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/vendors',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(VendorController.getVendors)
  );

  fastify.get(
    '/current',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(VendorController.getVendor)
  );
}
