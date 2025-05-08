import { Module } from '@nestjs/common';
import { UserDashboardController } from './user-dashboard.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserDashboardController],
})
export class UserDashboardModule {} 