import { FastifyInstance } from 'fastify';
import { authRoute } from '../Services/Auth/auth.routes';
import { clientRoute } from '../Services/Client/client.routes';
import { vendorRoute } from '../Services/Vendor/vendor.routes';
import { invoiceRoute } from '../Services/Invoice/invoice.routes';
import { healthCheck } from '../utils/index';
import InternalServerError from '../utils/errors/internalServerError';
import { walletRoute } from '../Services/Wallet/wallet.routes';

export const initRoute = (server: FastifyInstance): void => {
  server.get('/', (_request, reply) => {
    reply.send({ name: 'Tradeazy Api Running...' });
  });
  server.get('/api/v1/health-check', async (request, reply) => {
    try {
      await healthCheck();
      reply.status(200).send({ status: 'ok' });
    } catch (e) {
      request.log.error(e);
      reply.status(500).send(new InternalServerError());
    }
  });
  server.register(authRoute, { prefix: '/api/v1/auth' });
  server.register(clientRoute, { prefix: '/api/v1/client' });
  server.register(vendorRoute, { prefix: '/api/v1/vendor' });
  server.register(invoiceRoute, { prefix: '/api/v1/invoice' });
  server.register(walletRoute, { prefix: '/api/v1/wallet' });
};
