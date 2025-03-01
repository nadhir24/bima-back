import { forwardRef, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [forwardRef(() => PaymentModule)], // ✅ Gunakan forwardRef
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService], // Penting: Ekspor CartService
})
export class CartModule {}
