import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from '../cart/cart.module';
import { PrismaModule } from 'prisma/prisma.module';
import { SnapModule } from './snap/snap.module';
import { RefundModule } from './refund/refund.module';
import { CatalogModule } from '../catalog/catalog.module';

console.log('SnapModule:', SnapModule);
console.log('RefundModule:', RefundModule);
console.log('CatalogModule:', CatalogModule);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    forwardRef(() => CartModule),
    PrismaModule,
    forwardRef(() => SnapModule),
    forwardRef(() => RefundModule),
    forwardRef(() => CatalogModule),
  ],
  // Removed exports of SnapService because it is not a provider in PaymentModule.
})
export class PaymentModule {}
