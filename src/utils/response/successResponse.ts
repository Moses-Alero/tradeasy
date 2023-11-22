import { STANDARD } from '../constants/constant';
import BaseResponse from './index';

export default class SuccessResponse<T> extends BaseResponse {
  constructor(
    message: string | Record<string, unknown>,
    status = STANDARD.SUCCESS,
    data: T = undefined
  ) {
    super();
    this.status = status;
    this.code = 'Success';
    this.message = message;
    this.data = data;
  }
}
