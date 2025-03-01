import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'
import Xendit from 'xendit-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentRequestService {
    private readonly xenditInstance: any;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.xenditInstance = new Xendit({
            secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
        });
    }
    async handlePaymentRequestPaidWebhook(webhookPayload: any): Promise<any> {
        console.log('Payment Request Paid Webhook diterima:', webhookPayload);

        const paymentRequests = this.xenditInstance.PaymentRequests;
        const xenditPaymentRequestId = webhookPayload.id; // Asumsi 'id' adalah xendit Payment Request ID

        try {
            // 1. Dapatkan detail Payment Request terbaru dari Xendit API (untuk memastikan data paling update)
            const paymentRequestXendit = await paymentRequests.getById(xenditPaymentRequestId);

            // 2. Update status Payment Request di database lokal kita
            await this.prisma.paymentRequest.update({
                where: { xenditPaymentRequestId: xenditPaymentRequestId },
                data: { status: paymentRequestXendit.status }, // Update status berdasarkan data dari Xendit
            });

            // 3. Tambahkan logika bisnis lain setelah Payment Request paid (opsional)
            // Contoh: Update status order terkait, kirim notifikasi ke user, dll.
            console.log(`Payment Request ${xenditPaymentRequestId} status updated to paid in database.`);

            return { message: 'Payment Request Paid Webhook processed successfully', status: 'updated' };

        } catch (error) {
            console.error('Error handling Payment Request Paid Webhook:', error);
            throw new Error('Gagal memproses Payment Request Paid Webhook.');
        }
    }
    async createPaymentRequest(payload: any): Promise<any> {
        const paymentRequests = this.xenditInstance.PaymentRequests;

        try {
            const createdPaymentRequest = await paymentRequests.create(payload);

            const savedPaymentRequest = await this.prisma.paymentRequest.create({
                data: {
                    xenditPaymentRequestId: createdPaymentRequest.id,
                    status: createdPaymentRequest.status,
                    amount: createdPaymentRequest.amount,
                    currency: createdPaymentRequest.currency,
                    paymentRequestUrl: createdPaymentRequest.payment_request_url,
                },
            });

            return savedPaymentRequest;
        } catch (error) {
            console.error('Error creating Payment Request:', error);
            throw new Error('Gagal membuat Payment Request Xendit.');
        }
    }

    async getPaymentRequestById(paymentRequestId: string): Promise<any> {
        const paymentRequests = this.xenditInstance.PaymentRequests;

        try {
            const paymentRequestXendit = await paymentRequests.getById(paymentRequestId);

            await this.prisma.paymentRequest.update({
                where: { xenditPaymentRequestId: paymentRequestId },
                data: { status: paymentRequestXendit.status },
            });

            const paymentRequestDB = await this.prisma.paymentRequest.findUnique({
                where: { xenditPaymentRequestId: paymentRequestId },
            });
            return paymentRequestDB;
        } catch (error) {
            console.error('Error getting Payment Request by ID:', error);
            throw new Error('Gagal mendapatkan Payment Request.');
        }
    }

    async listPaymentRequests(queryParams?: any): Promise<any[]> {
        const paymentRequests = this.xenditInstance.PaymentRequests;

        try {
            const paymentRequestListXendit = await paymentRequests.list(queryParams);
            return paymentRequestListXendit.data;
        } catch (error) {
            console.error('Error listing Payment Requests:', error);
            throw new Error('Gagal mendapatkan daftar Payment Request.');
        }
    }

    async expirePaymentRequest(paymentRequestId: string): Promise<any> {
        const paymentRequests = this.xenditInstance.PaymentRequests;

        try {
            const expiredPaymentRequestXendit = await paymentRequests.expire(paymentRequestId);

            await this.prisma.paymentRequest.update({
                where: { xenditPaymentRequestId: paymentRequestId },
                data: { status: expiredPaymentRequestXendit.status },
            });

            const paymentRequestDB = await this.prisma.paymentRequest.findUnique({
                where: { xenditPaymentRequestId: paymentRequestId },
            });
            return paymentRequestDB;
        } catch (error) {
            console.error('Error expiring Payment Request:', error);
            throw new Error('Gagal membatalkan Payment Request.');
        }
    }
}