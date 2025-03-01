import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceService } from '././invoice/invoice.service'; // Import service fitur lain yang relevan
import { PaymentRequestService } from './payment-request/payment-request.service';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly invoiceService: InvoiceService, // Inject service fitur lain
    private readonly prisma : PrismaService,
    private readonly paymentRequestService: PaymentRequestService,
  ) {}

  async processWebhook(webhookPayload: any) {
    // Logika untuk memproses webhook payload
    console.log('Webhook diterima:', webhookPayload);

    // Tentukan jenis webhook berdasarkan payload (misalnya, berdasarkan event type)
    const eventType = webhookPayload.event; // Sesuaikan dengan struktur webhook Xendit

    if (eventType === 'invoice.paid') {
      // Distribusikan ke InvoiceService untuk handle invoice paid event
      return this.invoiceService.handleInvoicePaidWebhook(webhookPayload);
    } else if (eventType === 'payment_request.paid') {
      // Distribusikan ke PaymentRequestService untuk handle payment request paid event
      return this.paymentRequestService.handlePaymentRequestPaidWebhook(
        webhookPayload,
      );
    } else {
      console.warn('Webhook event type tidak dikenal:', eventType);
      return { message: 'Webhook event type tidak dikenal' };
    }
  }
  async getPaymentRequestStatus(paymentRequestId: string) {
    const paymentRequest = await this.prisma.paymentRequest.findUnique({
      where: { xenditPaymentRequestId: paymentRequestId },
    });

    if (!paymentRequest) {
      throw new NotFoundException('Payment Request tidak ditemukan');
    }

    return { status: paymentRequest.status }; // Hanya return status saja
  }
}
