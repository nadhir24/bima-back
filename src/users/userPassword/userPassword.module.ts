import { Module } from '@nestjs/common';
import { UserPasswordService } from './UserPasswordService';
import { UserPasswordController } from './UserPasswordController';

@Module({
  providers: [UserPasswordService],
  controllers: [UserPasswordController],
})
export class UserPasswordModule {}
