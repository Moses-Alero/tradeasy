import BaseResponse from '../response/index';
import { ErrorsConstants } from '../constants/errors';
// import { Message } from '../response';

export default class InternalServerError extends BaseResponse {
  constructor(
    message: string = 'An error occurred. Try again later',
    status = ErrorsConstants.internal_error_status,
    code = ErrorsConstants.internal_error_code
  ) {
    super();
    this.success = false;
    this.status = status;
    this.code = code;
    this.message = message;
  }
}
