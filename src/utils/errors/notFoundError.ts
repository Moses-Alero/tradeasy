import BaseResponse from '../response/index';
import { ErrorsConstants } from '../constants/errors';

export default class NotFoundError extends BaseResponse {
  constructor(message: string | Record<string, unknown>) {
    super();
    this.success = false;
    this.message = message;
    this.status = ErrorsConstants.notFound_status;
    this.code = ErrorsConstants.notFound_code;
  }
}
