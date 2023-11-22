import { FastifyRequest } from 'fastify';
import { JSONWebToken } from '../utils/JSONWebToken';
import { prisma } from '../utils/prisma';
import AuthorizationError from '../utils/errors/authorizationError';
import InternalServerError from '../utils/errors/internalServerError';
import ValidationError from '../utils/errors/validationError';
import { Message } from '../utils/response';
import { IJwtDecodedPayload, IVendor } from '../utils/interface';

const jwt = new JSONWebToken();

export class AuthMiddleware {
  static async authenticate(request: FastifyRequest): Promise<any> {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader)
      return new AuthorizationError(Message.REQUIRED_AUTHORIZATION);

    const details = authorizationHeader.split(' ');
    if (details[0] !== 'Bearer' || !details[1]) {
      throw new AuthorizationError(Message.INVALID_AUTHORIZATION);
    }
    try {
      const decoded: IJwtDecodedPayload = jwt.verify(details[1]);
      const vendor = await prisma.vendor.findUnique({
        where: { id: decoded.id },
      });

      if (!vendor) {
        return new ValidationError(Message.INVALID_USER);
      }

      request.user = vendor as Partial<IVendor>;

      return vendor;
    } catch (e) {
      request.log.error(e);

      return new InternalServerError();
    }
  }
}
