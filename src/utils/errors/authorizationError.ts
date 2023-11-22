import BaseResponse from '../response/index';
import { ErrorsConstants } from '../constants/errors';

export default class AuthorizationError extends BaseResponse {
  constructor(message: string | Record<string, unknown>) {
    super();
    this.success = false;
    this.status = ErrorsConstants.authorization_status;
    this.code = ErrorsConstants.authorization_code;
    this.message = message;
  }
}
