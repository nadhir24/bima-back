// src/users/user-password/user-password.controller.ts
import { Controller, Body, Param, Put, HttpStatus, Post } from '@nestjs/common';
import { UserPasswordService } from './userPassword.service';
import { CreateOrUpdateUserPasswordDto } from './dto/create-update-user-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from '../dto/UpdateUser.dto';
import * as bcrypt from 'bcrypt';
@Controller('users/password')
export class UserPasswordController {
  constructor(private readonly userPasswordService: UserPasswordService) {}


  @Put(':id')
  async createOrUpdate(
    @Param('id') id: string,
    @Body() createOrUpdateUserPasswordDto: CreateOrUpdateUserPasswordDto,
  ) {
    try {
      const user = await this.userPasswordService.findOne(+id);

      if (
        createOrUpdateUserPasswordDto.new_password !==
        createOrUpdateUserPasswordDto.retype_password
      ) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Password and Confirm Password do not match',
        };
      }

      if (user !== null && user.passwordHash !== null) {
        const isCurrentPasswordSame = await bcrypt.compare(
          createOrUpdateUserPasswordDto.current_password,
          user.passwordHash,
        );

        if (!isCurrentPasswordSame) {
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Current password is incorrect',
          };
        }
      }

      await this.userPasswordService.createOrUpdate(
        +id,
        createOrUpdateUserPasswordDto,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Password successfully updated',
      };
    } catch (e) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: e.message };
    }
  }
}

  //   @Post('forgotPassword')
  //   forgotPassword(@Body() body: any) {
  //     const { email } = body;
  //     return this.userPasswordService.forgotPassword(email);
  //   }

  //   @Post('resetPassword')
  //   resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
  //     return this.userPasswordService.resetPassword(resetPasswordDto);
  //   }