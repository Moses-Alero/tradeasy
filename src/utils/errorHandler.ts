import { Prisma } from '@prisma/client';
import ConflictError from './errors/conflictError';
import NotFoundError from './errors/notFoundError';
import { Message } from './response';

export const handleDBError = (error: Error): ConflictError | NotFoundError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictError(Message.RECORD_ALREADY_EXIST);
      // throw new Exception(Message.RECORD_ALREADY_EXIST, 409);
    }
    if (error.code === 'P2025') {
      return new NotFoundError(Message.RECORD_DOES_NOT_EXIST);
      // throw new Exception(Message.RECORD_DOES_NOT_EXIST, 404);
    }
  }
};
