import { environment } from '../config/environment';
import fastify, { FastifyInstance } from 'fastify';
import pino from 'pino';
export const startServer = async (server: FastifyInstance): Promise<void> => {
  try {
    if (environment.appEnv === 'production') {
      for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () =>
          server.close().then((err) => {
            console.log(`close application on ${signal}`);
            process.exit(err ? 1 : 0);
          })
        );
      }
    }
    await server.listen({ port: environment.port, host: '0.0.0.0' });
  } catch (e) {
    pino().error(e);
    console.error(e);
  }
};
