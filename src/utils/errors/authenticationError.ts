import BaseResponse from '../response/index';
import { ErrorsConstants } from '../constants/errors';

export default class AuthenticationError extends BaseResponse {
  constructor(message: string | Record<string, unknown>) {
    super();
    this.success = false;
    this.status = ErrorsConstants.authentication_status;
    this.code = ErrorsConstants.authentication_code;
    this.message = message;
  }
}
