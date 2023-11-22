import { FastifyRequest } from 'fastify';
import { ApiResponse, IVendor } from '../../utils/interface';
import { AuthService } from './auth.service';

export class AuthController {
  static async signup(request: FastifyRequest): Promise<ApiResponse<IVendor>> {
    return await AuthService.signup(request);
  }
  static async login(
    request: FastifyRequest
  ): Promise<ApiResponse<{ token: string; user: IVendor }>> {
    return await AuthService.login(request);
  }
  static async verifyVendorEmail(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await AuthService.verifyVendorEmail(request);
  }
  static async resetPassword(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await AuthService.resetPassword(request);
  }

  static async recoverPassword(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await AuthService.recoverPasswordOtp(request);
  }

  static async resendEmailOtp(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return AuthService.resendEmailOTP(request);
  }
}
