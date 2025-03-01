import { Injectable } from '@nestjs/common';
import Xendit from 'xendit-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentMethodService {
    private readonly xenditInstance: any;

    constructor(
        private configService: ConfigService,
    ) {
        this.xenditInstance = new Xendit({
            secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
        });
    }

    async getPaymentMethods(): Promise<any[]> {
        const paymentMethods = this.xenditInstance.PaymentMethods;

        try {
            const paymentMethodListXendit = await paymentMethods.list();
            return paymentMethodListXendit; // Return seluruh list payment method dari Xendit
        } catch (error) {
            console.error('Error getting Payment Methods:', error);
            throw new Error('Gagal mendapatkan daftar Payment Method.');
        }
    }
}