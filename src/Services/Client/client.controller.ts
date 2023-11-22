import { FastifyRequest } from 'fastify';
import { ClientService } from './client.service';
import { ApiResponse, IClient } from '../../utils/interface';

export class ClientController {
  static async createClient(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    return await ClientService.createClient(request);
  }
  static async getClient(
    request: FastifyRequest
  ): Promise<ApiResponse<IClient>> {
    return await ClientService.getClient(request);
  }
  static async getAllClients(
    request: FastifyRequest
  ): Promise<ApiResponse<IClient[]>> {
    return await ClientService.getAllClients(request);
  }
}
