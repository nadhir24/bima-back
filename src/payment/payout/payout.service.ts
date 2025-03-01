import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import Xendit from 'xendit-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayoutService {
    private readonly xenditInstance: any;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.xenditInstance = new Xendit({
            secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
        });
    }

    async createPayout(payload: any): Promise<any> {
        const payouts = this.xenditInstance.Payouts;

        try {
            const createdPayout = await payouts.create(payload);

            const savedPayout = await this.prisma.payout.create({
                data: {
                    xenditPayoutId: createdPayout.id,
                    status: createdPayout.status,
                    amount: createdPayout.amount,
                    bankCode: payload.bank_code,
                    accountNumber: payload.account_number,
                    description: payload.description,
                },
            });

            return savedPayout;
        } catch (error) {
            console.error('Error creating Payout:', error);
            throw new Error('Gagal membuat Payout Xendit.');
        }
    }

    async getPayoutById(payoutId: string): Promise<any> {
        const payouts = this.xenditInstance.Payouts;

        try {
            const payoutXendit = await payouts.getById(payoutId);

            await this.prisma.payout.update({
                where: { xenditPayoutId: payoutId },
                data: { status: payoutXendit.status },
            });

            const payoutDB = await this.prisma.payout.findUnique({
                where: { xenditPayoutId: payoutId },
            });
            return payoutDB;
        } catch (error) {
            console.error('Error getting Payout by ID:', error);
            throw new Error('Gagal mendapatkan Payout.');
        }
    }

    async listPayouts(queryParams?: any): Promise<any[]> {
        const payouts = this.xenditInstance.Payouts;

        try {
            const payoutListXendit = await payouts.list(queryParams);
            return payoutListXendit.data;
        } catch (error) {
            console.error('Error listing Payouts:', error);
            throw new Error('Gagal mendapatkan daftar Payout.');
        }
    }

    async cancelPayout(payoutId: string): Promise<any> {
        const payouts = this.xenditInstance.Payouts;

        try {
            const cancelledPayoutXendit = await payouts.cancel(payoutId);

            await this.prisma.payout.update({
                where: { xenditPayoutId: payoutId },
                data: { status: cancelledPayoutXendit.status },
            });

            const payoutDB = await this.prisma.payout.findUnique({
                where: { xenditPayoutId: payoutId },
            });
            return payoutDB;
        } catch (error) {
            console.error('Error cancelling Payout:', error);
            throw new Error('Gagal membatalkan Payout.');
        }
    }
}