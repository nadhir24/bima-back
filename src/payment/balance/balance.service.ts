import { Injectable } from '@nestjs/common';
import Xendit from 'xendit-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BalanceService {
    private readonly xenditInstance: any;

    constructor(
        private configService: ConfigService,
    ) {
        this.xenditInstance = new Xendit({
            secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
        });
    }

    async getBalance(): Promise<any> {
        const balance = this.xenditInstance.Balance;

        try {
            const balanceXendit = await balance.getBalance();
            return balanceXendit;
        } catch (error) {
            console.error('Error getting Balance:', error);
            throw new Error('Gagal mendapatkan Balance.');
        }
    }
}