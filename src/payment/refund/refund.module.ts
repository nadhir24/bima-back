import { Module } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { PrismaModule } from 'prisma/prisma.module';
import { SnapModule } from '../snap/snap.module';

@Module({
  imports: [PrismaModule, SnapModule],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
