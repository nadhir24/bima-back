// src/payment/snap/snap.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { CartModule } from 'src/cart/cart.module';
import { SnapService } from './snap.service';
import { SnapController } from './snap.controller';

@Module({
  imports: [forwardRef(() => CartModule), ConfigModule, PrismaModule],
  providers: [SnapService],
  controllers: [SnapController],
  exports: [SnapService],
})
export class SnapModule {}
