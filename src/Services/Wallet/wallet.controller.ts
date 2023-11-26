import { FastifyRequest } from 'fastify';
import { WalletService } from './wallet.service';
import { ApiResponse, IAccountInfo, IBankData } from '../../utils/interface';

export class WalletController {
  static async getBanks(
    request: FastifyRequest
  ): Promise<ApiResponse<IBankData[]>> {
    return await WalletService.getBanks(request);
  }

  static async verifyBankAccount(
    request: FastifyRequest
  ): Promise<ApiResponse<IAccountInfo>> {
    return await WalletService.verifyBankAccount(request);
  }

  static async withdrawToBank(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await WalletService.withdrawToBank(request);
  }
  static async webhook(request: FastifyRequest): Promise<ApiResponse<void>> {
    return await WalletService.flutterwaveWebhook(request);
  }

  static async getPaymentHistory(
    request: FastifyRequest
  ): Promise<ApiResponse<any>> {
    return await WalletService.getPaymentHistory(request);
  }
}
