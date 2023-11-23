import { FastifyInstance } from 'fastify';
import { ResponseHandler } from '../../utils/responsehandler';
import { ClientController } from './client.controller';
import { AuthMiddleware } from '../../middleware/auth.middleware';

export async function clientRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/:id',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(ClientController.getClient)
  );
  fastify.get(
    '/all',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(ClientController.getAllClients)
  );
  fastify.post(
    '/create',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(ClientController.createClient)
  );
  fastify.post(
    '/update/:id',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(ClientController.updateClient)
  );
  fastify.delete(
    '/delete/:id',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(ClientController.deleteClient)
  );
}
