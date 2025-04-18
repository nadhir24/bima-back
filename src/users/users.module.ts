import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from 'prisma/prisma.service';
import { UserPasswordModule } from './userPassword/userPassword.module';
import { MailModule } from './mail/mail.module';
import { UserRoleModule } from './user-role/user-role.module';

@Module({
  providers: [UsersService, PrismaService], // Daftarkan UsersService di sini
  controllers: [UsersController],
  exports:[UsersService],
  imports: [UserPasswordModule, MailModule, UserRoleModule]
})
export class UsersModule {}
