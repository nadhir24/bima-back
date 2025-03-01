import { Injectable } from '@nestjs/common';
import Xendit from 'xendit-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionService {
    private readonly xenditInstance: any;

    constructor(
        private configService: ConfigService,
    ) {
        this.xenditInstance = new Xendit({
            secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
        });
    }

    async listTransactions(queryParams?: any): Promise<any[]> {
        const transactions = this.xenditInstance.Transactions;

        try {
            const transactionListXendit = await transactions.list(queryParams);
            return transactionListXendit.data;
        } catch (error) {
            console.error('Error listing Transactions:', error);
            throw new Error('Gagal mendapatkan daftar Transaksi.');
        }
    }

    async getTransactionById(transactionId: string): Promise<any> {
        const transactions = this.xenditInstance.Transactions;

        try {
            const transactionXendit = await transactions.getById(transactionId);
            return transactionXendit;
        } catch (error) {
            console.error('Error getting Transaction by ID:', error);
            throw new Error('Gagal mendapatkan Transaksi.');
        }
    }
}