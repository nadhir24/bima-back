import { forwardRef, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PaymentModule } from 'src/payment/payment.module';
import { CatalogModule } from 'src/catalog/catalog.module';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    forwardRef(() => CatalogModule)
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
