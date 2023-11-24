import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  ApiResponse,
  HtmlRequestHandler,
  RequestHandler,
} from './interface';
import { NotFoundtemplate } from './templates/404.template';

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
  static handleHTML<T>(func: HtmlRequestHandler<T>) {
    //return Html as response or 404 page
    return async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
      try {
        const response = await func(req);

        res
          .status(200)
          .header('Content-Type', 'text/html; charset=utf-8')
          .send(response);
      } catch (error) {
        const notFound = NotFoundtemplate();
        res
          .status(404)
          .header('Content-Type', 'text/html; charset=utf-8')
          .send(notFound);
      }
    };
  }
}
