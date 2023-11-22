import { FastifyRequest } from 'fastify';
import { handleDBError } from '../../utils/errorHandler';
import InternalServerError from '../../utils/errors/internalServerError';
import { ApiResponse, IVendor } from '../../utils/interface';
import { prisma } from '../../utils/prisma';
import { server } from '../../index';
import SuccessResponse from '../../utils/response/successResponse';
import { Message } from '../../utils/response';
import { STANDARD } from '../../utils/constants/constant';
import NotFoundError from '../../utils/errors/notFoundError';
export class VendorService {
  static async getVendors(
    request: FastifyRequest
  ): Promise<ApiResponse<IVendor[]>> {
    try {
      const vendors = await prisma.vendor.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          address: true,
          phone: true,
          email: true,
          businessType: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return new SuccessResponse(
        Message.VENDORS_FETCHED,
        STANDARD.SUCCESS,
        vendors
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }

  static async getVendor(
    request: FastifyRequest
  ): Promise<ApiResponse<Partial<IVendor>>> {
    try {
      const { id } = request.user as IVendor;
      const vendor = await prisma.vendor.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          businessType: true,
          address: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!vendor) return new NotFoundError(Message.VENDOR_NOT_FOUND);
      return new SuccessResponse(
        Message.VENDOR_FETCHED,
        STANDARD.SUCCESS,
        vendor
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }

  static async updateVendorProfile(
    request: FastifyRequest
  ): Promise<ApiResponse<IVendor>> {
    try {
      const vendor = request.user as IVendor;
      const { firstName, lastName, address, phone, email } =
        request.body as IVendor;
      await prisma.vendor.update({
        where: {
          id: vendor.id,
        },
        data: {
          firstName,
          lastName,
          address,
          phone,
          email,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          address: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return new SuccessResponse<IVendor>(Message.SUCCESSFUL_PROFILE_SETUP);
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }
}