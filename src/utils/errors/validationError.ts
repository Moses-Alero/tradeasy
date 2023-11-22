import { ErrorsConstants } from '../constants/errors';
import BaseResponse from '../response/index';

export default class ValidationError extends BaseResponse {
  constructor(message: string, code = ErrorsConstants.validation_code) {
    super();
    this.success = false;
    this.status = ErrorsConstants.validation_status;
    this.code = code;
    this.message = message;
  }
}
