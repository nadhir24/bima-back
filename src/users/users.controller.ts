import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Body,
  Res,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Response } from 'express';
import { ok } from 'assert';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register/sendVerificationCode')
  async sendVerificationCode(
    @Body('phoneNumber') phoneNumber: string,
    @Res() res: Response,
  ) {
    try {
      const otp = await this.usersService.sendVerificationCode(phoneNumber);
      res.status(HttpStatus.OK).json({ phoneNumber, otp });
    } catch (error) {
      console.error('Error in controller:', error);
      res
        .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: error.message });
    }
  }

  @Get('getAllUsers')
  async getAllUsers(): Promise<any> {
    try {
      const users = await this.usersService.getAll();
      return { users };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('register/verifyPhoneNumber')
  async verifyPhoneNumber(
    @Body('userId') userId: number,
    @Body('otp') otp: string,
  ): Promise<any> {
    try {
      const isVerified = await this.usersService.verifyPhoneNumber(userId, otp);
      if (isVerified) {
        return { message: 'Phone number verified successfully' };
      } else {
        throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('register/details')
  async register(
    @Body('phoneNumber') phoneNumber: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('retypePassword') retypePassword: string,
  ): Promise<any> {
    try {
      await this.usersService.register(
        phoneNumber,
        email,
        password,
        retypePassword,
      );
      return { message: 'Registration successful', HttpStatus, ok };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('findUsers/:id')
  async findUsers(@Param('id') id: string): Promise<any> {
    try {
      const user = await this.usersService.findUsers(Number(id));
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return { user };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
