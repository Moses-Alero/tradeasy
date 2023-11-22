import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ApiResponse, RequestHandler } from './interface';

export class ResponseHandler {
  static handle<T>(func: RequestHandler<T>) {
    return async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
      try {
        const { status, success, message, data, code } = await func(req);
        const response: ApiResponse<T> = {
          success: success ?? true,
          code,
          message,
          data,
        };
        res.status(status || 200).send(response);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: 'Internal Server Error' });
      }
    };
  }
}
