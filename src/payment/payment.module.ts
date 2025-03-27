import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from 'src/cart/cart.module';
import { PrismaModule } from 'prisma/prisma.module';
import { SnapModule } from './snap/snap.module';
import { RefundModule } from './refund/refund.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    forwardRef(() => CartModule),
    PrismaModule,
    SnapModule,
    RefundModule,
  ],
  exports: [SnapModule, RefundModule],
})
export class PaymentModule {}
