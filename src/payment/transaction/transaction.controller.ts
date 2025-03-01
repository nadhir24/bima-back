import { Controller, Get, Param, Query, Res, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Response } from 'express';
import { ListTransactionsDto } from '../dto/list-transaction.dto'; // Import DTO

@Controller('payment/transaction')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) {}

    @Get()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async listTransactions(@Query() queryParams: ListTransactionsDto, @Res() res: Response) { // Gunakan DTO
        try {
            const transactions = await this.transactionService.listTransactions(queryParams);
            return res.status(HttpStatus.OK).json({
                data: transactions,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan daftar Transaksi',
                error: error.message,
            });
        }
    }

    @Get(':id')
    async getTransactionById(@Param('id') transactionId: string, @Res() res: Response) {
        try {
            const transaction = await this.transactionService.getTransactionById(transactionId);
            if (!transaction) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: 'Transaksi tidak ditemukan',
                });
            }
            return res.status(HttpStatus.OK).json({
                data: transaction,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan Transaksi',
                error: error.message,
            });
        }
    }
}