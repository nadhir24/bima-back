import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { Response } from 'express';

@Controller('payment/balance')
export class BalanceController {
    constructor(private readonly balanceService: BalanceService) {}

    @Get()
    async getBalance(@Res() res: Response) {
        try {
            const balance = await this.balanceService.getBalance();
            return res.status(HttpStatus.OK).json({
                data: balance,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan Balance',
                error: error.message,
            });
        }
    }
}