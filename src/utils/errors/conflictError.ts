import BaseResponse from '../response/index';
import { ErrorsConstants } from '../constants/errors';

export default class ConflictError extends BaseResponse {
  constructor(message: string | Record<string, unknown>) {
    super();
    this.success = false;
    this.status = ErrorsConstants.conflict_status;
    this.code = ErrorsConstants.conflict_code;
    this.message = message;
  }
}
