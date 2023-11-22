import { FastifyInstance } from 'fastify';
import { ResponseHandler } from '../../utils/responsehandler';
import { AuthController } from './auth.controller';
import { IErrorResponse } from '../../utils/interface';
import { AuthMiddleware } from '../../middleware/auth.middleware';

function errorResponseBuilder(): IErrorResponse {
  return {
    statusCode: 429,
    error: 'Too Many Requests',
    message:
      'Oops! You’ve made quite a few requests in a short time. Please wait a moment before trying again. We appreciate your patience!',
  };
}

export async function authRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post('/sign-up', {}, ResponseHandler.handle(AuthController.signup));
  fastify.post('/login', {}, ResponseHandler.handle(AuthController.login));
  fastify.post(
    '/verify-email',
    {},
    ResponseHandler.handle(AuthController.verifyVendorEmail)
  );
  fastify.post(
    '/resend-otp',
    {
      config: { rateLimit: { max: 1, timeWindow: '1m', errorResponseBuilder } },
    },
    ResponseHandler.handle(AuthController.resendEmailOtp)
  );
  fastify.post(
    '/recover-password',
    {
      config: { rateLimit: { max: 1, timeWindow: '1m', errorResponseBuilder } },
    },
    ResponseHandler.handle(AuthController.recoverPassword)
  );
  fastify.post(
    '/reset-password',
    { onRequest: [AuthMiddleware.authenticate] },
    ResponseHandler.handle(AuthController.resetPassword)
  );
}
