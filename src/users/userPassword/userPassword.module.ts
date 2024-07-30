import { Module } from '@nestjs/common';
import { UserPasswordService } from './userPassword.service';
import { UserPasswordController } from './userPassword.controller';

@Module({
  providers: [UserPasswordService],
  controllers: [UserPasswordController]
})
export class UserPasswordModule {}
