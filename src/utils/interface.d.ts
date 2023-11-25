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
import { Method } from 'axios';

export const enum transactionHistoryType {
  credit = 'credit',
  debit = 'debit',
}

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

export type IFlutterwaveTransaction = {
  id: number;
  tx_ref: string;
  flw_ref: string;
  device_fingerprint: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number;
  merchant_fee: number;
  processor_response: string;
  auth_model: string;
  ip: string;
  narration: string;
  status: string;
  payment_type: string;
  created_at: string;
  account_id: number;
  card: IFlutterwaveTransactionCard;
  meta: {
    email: string;
  };
  amount_settled: number;
  customer: {
    id: number;
    name: string;
    phone_number: string;
    email: string;
    created_at: string;
  };
};
export type IFlutterwaveTransactionCard = {
  first_6digits: string;
  last_4digits: string;
  issuer: string;
  country: string;
  type: string;
  token: string;
  expiry: string;
};

export type IFlutterwaveInputPayload = {
  id: string;
  amount: number;
  txRef: string;
  invoiceId: string;
};

export interface HTTPMethods {
  GET: Method;
  PUT: Method;
  PATCH: Method;
  POST: Method;
  DELETE: Method;
}

export interface IBankData {
  id: number;
  code: string;
  bank: string;
}

export interface IBankResponse {
  status: string;
  message: string;
  data: IBankData[];
}

export interface IBankAccountInfo {
  accountNumber: string;
  bankCode: string;
}

export interface IAccountInfo {
  account_number: string;
  account_name: string;
}
export interface IBankAccountResponse {
  status: string;
  message: string;
  data: IAccountInfo;
}

export interface IWithdraw {
  bankCode: string;
  accountNumber: string;
  amount: number;
  narration: string;
}

export interface ICreateTransaction {
  reason: string;
  userId: string;
  amount: number;
  transactionType: transactionHistoryType;
}

export interface IPagination {
  pageSize?: string;
  pageNumber?: string;
}
