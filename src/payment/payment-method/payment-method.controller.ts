import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { Response } from 'express';

@Controller('payment/payment-method')
export class PaymentMethodController {
    constructor(private readonly paymentMethodService: PaymentMethodService) {}

    @Get()
    async getPaymentMethods(@Res() res: Response) {
        try {
            const paymentMethods = await this.paymentMethodService.getPaymentMethods();
            return res.status(HttpStatus.OK).json({
                data: paymentMethods,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan daftar Payment Method',
                error: error.message,
            });
        }
    }
}