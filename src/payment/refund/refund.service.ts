import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import Xendit from 'xendit-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefundService {
    private readonly xenditInstance: any;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.xenditInstance = new Xendit({
            secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
        });
    }

    async createRefund(paymentId: number, payload: any): Promise<any> {
        const refunds = this.xenditInstance.Refunds;
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });

        if (!payment || !payment.xenditPaymentId) {
            throw new Error('Payment tidak ditemukan atau tidak memiliki xenditPaymentId.');
        }

        try {
            const createdRefund = await refunds.create({
                ...payload,
                payment_id: payment.xenditPaymentId, // Gunakan xenditPaymentId dari model Payment
            });

            const savedRefund = await this.prisma.refund.create({
                data: {
                    paymentId: paymentId, // Simpan paymentId dari database lokal
                    xenditRefundId: createdRefund.id,
                    status: createdRefund.status,
                    amount: createdRefund.amount,
                    reason: payload.reason,
                },
            });

            return savedRefund;
        } catch (error) {
            console.error('Error creating Refund:', error);
            throw new Error('Gagal membuat Refund Xendit.');
        }
    }

    async getRefundById(refundId: string): Promise<any> {
        const refunds = this.xenditInstance.Refunds;

        try {
            const refundXendit = await refunds.getById(refundId);

            await this.prisma.refund.update({
                where: { xenditRefundId: refundId },
                data: { status: refundXendit.status },
            });

            const refundDB = await this.prisma.refund.findUnique({
                where: { xenditRefundId: refundId },
            });
            return refundDB;
        } catch (error) {
            console.error('Error getting Refund by ID:', error);
            throw new Error('Gagal mendapatkan Refund.');
        }
    }

    async listRefunds(queryParams?: any): Promise<any[]> {
        const refunds = this.xenditInstance.Refunds;

        try {
            const refundListXendit = await refunds.list(queryParams);
            return refundListXendit.data;
        } catch (error) {
            console.error('Error listing Refunds:', error);
            throw new Error('Gagal mendapatkan daftar Refund.');
        }
    }
}