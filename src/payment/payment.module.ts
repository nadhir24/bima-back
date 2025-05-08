import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from 'prisma/prisma.module';
import { SnapModule } from './snap/snap.module';
import { RefundModule } from './refund/refund.module';

@Module({
  imports: [PrismaModule, forwardRef(() => SnapModule), RefundModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
