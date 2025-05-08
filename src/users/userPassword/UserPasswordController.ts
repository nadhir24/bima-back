import {
  Controller,
  Post,
  Body,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UserPasswordService } from './UserPasswordService';

@Controller('user-password')
export class UserPasswordController {
  constructor(private readonly userPasswordService: UserPasswordService) {}

  @Post('change/:userId')
  async changePassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() passwordData: { oldPassword: string; newPassword: string },
  ) {
    return this.userPasswordService.changePassword(
      userId,
      passwordData.oldPassword,
      passwordData.newPassword,
    );
  }

  @Post('reset/:userId')
  async resetPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() passwordData: { newPassword: string },
  ) {
    return this.userPasswordService.resetPassword(
      userId,
      passwordData.newPassword,
    );
  }
}
