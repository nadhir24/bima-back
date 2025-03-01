import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { InvoiceService } from './invoice/invoice.service';
import { InvoiceController } from './invoice/invoice.controller';
import { PaymentRequestService } from './payment-request/payment-request.service';
import { PaymentRequestController } from './payment-request/payment-request.controller';
import { PaymentMethodController } from './payment-method/payment-method.controller';
import { PaymentMethodService } from './payment-method/payment-method.service';
import { RefundService } from './refund/refund.service';
import { RefundController } from './refund/refund.controller';
import { BalanceController } from './balance/balance.controller';
import { BalanceService } from './balance/balance.service';
import { TransactionService } from './transaction/transaction.service';
import { TransactionController } from './transaction/transaction.controller';
import { CustomerController } from './customer/customer.controller';
import { CustomerService } from './customer/customer.service';
import { PayoutService } from './payout/payout.service';
import { PayoutController } from './payout/payout.controller';
import { CartModule } from 'src/cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    forwardRef(() => CartModule), // ✅ Gunakan forwardRef jika ada circular dependency
  ],
  providers: [
    PaymentService,
    InvoiceService,
    PaymentRequestService,
    PaymentMethodService,
    RefundService,
    BalanceService,
    TransactionService,
    CustomerService,
    PayoutService,
  ],
  controllers: [
    InvoiceController,
    PaymentRequestController,
    PaymentMethodController,
    RefundController,
    BalanceController,
    TransactionController,
    CustomerController,
    PayoutController,
  ],
})
export class PaymentModule {}
