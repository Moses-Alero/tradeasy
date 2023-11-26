import { FastifyInstance } from 'fastify/types/instance';
import { ResponseHandler } from '../../utils/responsehandler';
import { WalletController } from './wallet.controller';
import { AuthMiddleware } from '../../middleware/auth.middleware';

export async function walletRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/banks', {}, ResponseHandler.handle(WalletController.getBanks));
  fastify.post(
    '/verify-account',
    { onRequest: AuthMiddleware.authenticate },
    ResponseHandler.handle(WalletController.verifyBankAccount)
  );
  fastify.post(
    '/withdraw',
    { onRequest: AuthMiddleware.authenticate },
    ResponseHandler.handle(WalletController.withdrawToBank)
  );
  fastify.post(
    '/webhook',
    {},
    ResponseHandler.handle(WalletController.webhook)
  );
  fastify.get(
    '/history',
    { onRequest: AuthMiddleware.authenticate },
    ResponseHandler.handle(WalletController.getPaymentHistory)
  );
}
