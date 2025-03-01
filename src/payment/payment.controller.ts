import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment/webhook') // Endpoint untuk menerima webhook
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async handleWebhook(@Body() webhookPayload: any) {
    return this.paymentService.processWebhook(webhookPayload); // Panggil service untuk proses webhook
  }
  @Get('status')
  getPaymentStatus(@Query('paymentRequestId') paymentRequestId: string) {
    return this.paymentService.getPaymentRequestStatus(paymentRequestId);
  }
}