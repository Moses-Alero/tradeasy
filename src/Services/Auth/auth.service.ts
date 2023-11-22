import { FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { environment as env } from '../../utils/config/environment';
import { server } from '../../index';
import { STANDARD } from '../../utils/constants/constant';
import { handleDBError } from '../../utils/errorHandler';
import InternalServerError from '../../utils/errors/internalServerError';
import {
  ApiResponse,
  EmailParams,
  IJwtDecodedPayload,
  IVendor,
} from '../../utils/interface';
import { prisma } from '../../utils/prisma';
import { Message } from '../../utils/response';
import SuccessResponse from '../../utils/response/successResponse';
import ConflictError from '../../utils/errors/conflictError';
import NotFoundError from '../../utils/errors/notFoundError';
import ValidationError from '../../utils/errors/validationError';
import { welcomeTemplate } from '../../utils/templates/welcome.template';
import { passwordRecoveryTemplate } from '../../utils/templates/passwordRecovery.template';
import { Mailer } from '../../utils/helper/mailer.helper';

export class AuthService {
  static async generateAndSendEmailOTP(
    email: string,
    name: string,
    request: FastifyRequest
  ): Promise<void> {
    try {
      const OTP = await this.generateOTPForUser(email);
      const emailBody = welcomeTemplate(name, OTP);
      const mailParams: EmailParams = {
        To: email,
        Subject: 'Welcome To TradEazy',
        Body: emailBody,
      };
      await Mailer.sendEmail(mailParams);
    } catch (error) {
      request.log.error(error);
      new InternalServerError();
    }
  }

  static async generateAndSendRecoverPasswordEmailOTP(
    email: string,
    name: string,
    request: FastifyRequest
  ): Promise<void> {
    try {
      const OTP = await this.generateOTPForUser(email);
      const emailBody = passwordRecoveryTemplate(name, OTP);
      const mailParams: EmailParams = {
        To: email,
        Subject: 'Password Recovery',
        Body: emailBody,
      };
      await Mailer.sendEmail(mailParams);
    } catch (error) {
      request.log.error(error);
      new InternalServerError();
    }
  }

  static async verifyVendorEmail(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const { email, OTP } = request.body as IVendor;

      const vendor = await prisma.vendor.findUnique({
        where: { email: email.toLocaleLowerCase() },
      });
      if (!vendor) {
        return new NotFoundError(Message.USER_NOT_FOUND);
      }
      const decoded = this.verifyUserOTP(vendor.OTP) as IJwtDecodedPayload;
      if (decoded.OTP !== OTP) {
        return new ValidationError(Message.INVALID_OTP);
      }
      if (vendor.isAccountVerified) {
        return new SuccessResponse(Message.EMAIL_VERIFIED);
      }
      await prisma.vendor.update({
        where: { email: email.toLocaleLowerCase() },
        data: {
          isAccountVerified: true,
        },
      });
      return new SuccessResponse(Message.EMAIL_VERIFIED);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async signup(request: FastifyRequest): Promise<ApiResponse<IVendor>> {
    try {
      const vendor = request.body as IVendor;
      const vendorExists = await prisma.vendor.findUnique({
        where: {
          email: vendor.email.toLocaleLowerCase(),
        },
      });
      if (vendorExists) return new ConflictError(Message.ACCOUNT_EXISTS);

      const password = await bcrypt.hash(vendor.password, 10);
      const newVendor = await prisma.vendor.create({
        data: {
          ...vendor,
          password,
        },
      });
      const token = server.jwt.sign(
        { id: newVendor.id, email: newVendor.email },
        { expiresIn: '3d' }
      );
      const vendorData = await this.vendorInfo(newVendor.id);
      const data = {
        token,
        vendor: vendorData,
      };
      // this.send verification otp;
      this.generateAndSendEmailOTP(
        newVendor.email,
        newVendor.firstName,
        request
      );
      return new SuccessResponse(
        Message.SUCCESSFUL_REGISTRATION,
        STANDARD.SUCCESS,
        data
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async login(
    request: FastifyRequest
  ): Promise<ApiResponse<{ token: string; user: IVendor }>> {
    try {
      const { password, email } = request.body as IVendor;

      const vendor = await prisma.vendor.findFirst({
        where: {
          email: email.toLocaleLowerCase(),
        },
      });
      if (!vendor) return new NotFoundError(Message.INVALID_USER);

      const isMatch = await bcrypt.compare(password, vendor.password);
      if (!isMatch) return new ValidationError(Message.INVALID_LOGIN_CRED);

      const currentVendor = await this.vendorInfo(vendor.id);

      const token = server.jwt.sign(
        { id: currentVendor.id, email: currentVendor.email },
        { expiresIn: '3d' }
      );

      const data = {
        token,
        vendor: currentVendor,
      };
      return new SuccessResponse(
        Message.SUCCESSFUL_LOGIN,
        STANDARD.SUCCESS,
        data
      );
    } catch (error) {
      request.log.error(error);
      handleDBError(error);
      new InternalServerError();
    }
  }

  static async resendEmailOTP(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const { email } = request.body as IVendor;
      const vendor = await prisma.vendor.findUnique({
        where: {
          email: email.toLocaleLowerCase(),
        },
      });
      if (!vendor) return new NotFoundError(Message.ACCOUNT_NOT_FOUND);
      if (vendor && vendor.isAccountVerified)
        return new ConflictError(Message.GENERAL_ERROR);
      await this.generateAndSendEmailOTP(email, vendor.firstName, request);
      return new SuccessResponse(
        Message.EMAIL_VERIFICATION_RESENT,
        STANDARD.SUCCESS
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async recoverPasswordOtp(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const { email } = request.body as IVendor;
      const vendor = await prisma.vendor.findUnique({
        where: { email: email.toLocaleLowerCase() },
      });
      if (!vendor) return new ConflictError(Message.GENERAL_ERROR);
      await this.generateAndSendRecoverPasswordEmailOTP(
        email,
        vendor.firstName,
        request
      );
      return new SuccessResponse(Message.RECOVERY_OTP_SENT, STANDARD.SUCCESS);
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async resetPassword(
    request: FastifyRequest
  ): Promise<ApiResponse<void>> {
    try {
      const user = request.user as IVendor;
      const { email, password } = request.body as IVendor;
      if (user.email !== email)
        return new ValidationError(Message.INVALID_USER);
      const newPassword = await bcrypt.hash(password, 10);
      const vendor = await prisma.vendor.findUnique({
        where: { email },
      });
      if (!vendor) return new NotFoundError(Message.USER_NOT_FOUND);
      await prisma.vendor.update({
        data: { password: newPassword },
        where: { email: email.toLocaleLowerCase() },
      });
      return new SuccessResponse(
        Message.SUCCESSFUL_PASSWORD_RESET,
        STANDARD.SUCCESS
      );
    } catch (e) {
      request.log.error(e);
      handleDBError(e);
      new InternalServerError();
    }
  }

  static async vendorInfo(id: string): Promise<Partial<IVendor>> {
    return await prisma.vendor.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        phone: true,
        address: true,
        businessType: true,
        city: true,
        state: true,
        country: true,
        firstName: true,
        lastName: true,
        website: true,
        zip: true,
        isBusinessVerified: true,
        isAccountVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static verifyUserOTP(userOTP: string): IJwtDecodedPayload {
    try {
      return server.jwt.verify(userOTP);
    } catch (e) {
      return new ValidationError(Message.EXPIRED_OTP);
    }
  }

  static async generateOTPForUser(email: string): Promise<string> {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 5; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }
    const userOTP = server.jwt.sign({ OTP }, { expiresIn: '3 min' });
    await prisma.vendor.update({
      where: { email },
      data: { OTP: userOTP },
    });
    return OTP;
  }
}
