import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Twilio } from 'twilio';
import * as bcrypt from 'bcrypt';
import parsePhoneNumberFromString from 'libphonenumber-js';

@Injectable()
export class UsersService {
  private twilioClient: Twilio;
  constructor(private prisma: PrismaService) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  async sendVerificationCode(phoneNumber: string) {
    try {
      const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber, 'ID'); // 'ID' for Indonesia
      if (!parsedPhoneNumber || !parsedPhoneNumber.isValid()) {
        throw new HttpException(
          'Invalid phone number format',
          HttpStatus.BAD_REQUEST,
        );
      }

      const formattedPhoneNumber = parsedPhoneNumber.format('E.164');

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire in 10 minutes

      console.log(`Sending OTP ${otp} to phone number ${formattedPhoneNumber}`);

      if (formattedPhoneNumber === process.env.TWILIO_PHONE_NUMBER) {
        throw new HttpException(
          'Cannot send message to the same Twilio number',
          HttpStatus.BAD_REQUEST,
        );
      }

      try {
        await this.twilioClient.messages.create({
          body: `Jangan Sebar OTP Ini: ${otp}`,
          to: formattedPhoneNumber,
        });
      } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        throw new HttpException(
          `Twilio error: ${twilioError.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = await this.prisma.users.findUnique({
        where: { phoneNumber: formattedPhoneNumber },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.oTP.create({
        data: {
          code: otp,
          userId: user.id,
          expiresAt,
        },
      });

      return otp;
    } catch (e) {
      console.error('Error sending verification code:', e);
      if (e.status && e.message) {
        throw new HttpException(e.message, e.status);
      }
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async verifyPhoneNumber(userId: number, otp: string) {
    try {
      const otpRecord = await this.prisma.oTP.findFirst({
        where: {
          userId,
          code: otp,
          expiresAt: {
            gte: new Date(), // Check if the OTP is not expired
          },
        },
      });

      if (!otpRecord) {
        return false;
      }

      await this.prisma.oTP.delete({ where: { id: otpRecord.id } });
      return true;
    } catch (error) {
      throw new Error('Failed to verify phone number');
    }
  }

  async register(
    phoneNumber: string,
    email: string,
    password: string,
    retypePassword: string,
  ): Promise<void> {
    try {
      if (password !== retypePassword) {
        throw new HttpException(
          'Passwords do not match',
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingUser = await this.prisma.users.findUnique({
        where: { phoneNumber },
      });

      if (existingUser) {
        throw new HttpException(
          'Phone number already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (email) {
        const existingEmail = await this.prisma.users.findUnique({
          where: { email },
        });

        if (existingEmail) {
          throw new HttpException(
            'Email already exists',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10); // Enkripsi kata sandi

      await this.prisma.users.create({
        data: {
          phoneNumber,
          email,
          password: hashedPassword, // Gunakan kata sandi yang telah dienkripsi
        },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to register user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async getAll() {
    try {
      return await this.prisma.users.findMany();
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
  async findUsers(id: number) {
    try {
      return await this.prisma.users.findFirst({ where: { id: id } });
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
