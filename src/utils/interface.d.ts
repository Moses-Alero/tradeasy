import { FastifyRequest, FastifyReply } from 'fastify';
import SuccessResponse from './response/successResponse';
import ValidationError from './errors/validationError';
import { JwtPayload } from 'jsonwebtoken';
import { Interface } from 'readline';
import {
  Client,
  Invoice,
  InvoiceItem,
  Vendor,
  Transaction,
} from '@prisma/client';

type RequestHandler<T> = (
  req: FastifyRequest,
  reply?: FastifyReply
) => Promise<ApiResponse<T>>;

type HtmlRequestHandler<T> = (
  req: FastifyRequest,
  reply?: FastifyReply
) => Promise<ApiResponse<T> | string>;
export interface IErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

export type ApiResponse<T> = SuccessResponse<T> &
  ValidationError & {
    message: string | Record<string, unknown>;
    success?: boolean;
    status?: number;
    data?: T;
  };

export type IJwtSignPayload = {
  id: string;
  email: string;
};

type PaginationResponse = {
  result: IConfigItem[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

type PaginateResult<T> = {
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string;
  };
  result: T;
};

type EmailParams = {
  Subject: string;
  Body: string;
  To: string;
};

export interface ITransaction extends Transaction {}
export interface ISetTransactionPinPayload {
  pin: string;
}
interface InputParamsObject<T> {
  [key: string]: T;
}

export type IJwtDecodedPayload = JwtPayload | Partial<IVendor>;

export interface IVendor extends Vendor {}
export interface IClient extends Client {}
export interface IInvoice extends Invoice {
  invoiceItems?: InvoiceItem[];
  issuedTo?: IClient;
}

interface IInvoiceStatistics {
  draftInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overDueInvoices: number;
}

export interface IInvoiceItem extends InvoiceItem {}
export type PaginationInputQuery = {
  limit?: number;
  cursor: string;
};
