import { Controller, Post, Get, Param, Body, Query, Res, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { Response } from 'express';
import { CreatePayoutDto } from '../dto/create-payout.dto'; // Import DTO
import { ListPayoutsDto } from '../dto/list-payout.dto'; // Import DTO

@Controller('payment/payout')
export class PayoutController {
    constructor(private readonly payoutService: PayoutService) {}

    @Post()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async createPayout(@Body() createPayoutDto: CreatePayoutDto, @Res() res: Response) { // Gunakan DTO
        try {
            const payout = await this.payoutService.createPayout(createPayoutDto);
            return res.status(HttpStatus.CREATED).json({
                message: 'Payout berhasil dibuat!',
                data: payout,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membuat Payout',
                error: error.message,
            });
        }
    }

    @Get(':id')
    async getPayoutById(@Param('id') payoutId: string, @Res() res: Response) {
        try {
            const payout = await this.payoutService.getPayoutById(payoutId);
            if (!payout) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: 'Payout tidak ditemukan',
                });
            }
            return res.status(HttpStatus.OK).json({
                data: payout,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan Payout',
                error: error.message,
            });
        }
    }

    @Get()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async listPayouts(@Query() queryParams: ListPayoutsDto, @Res() res: Response) { // Gunakan DTO
        try {
            const payouts = await this.payoutService.listPayouts(queryParams);
            return res.status(HttpStatus.OK).json({
                data: payouts,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan daftar Payout',
                error: error.message,
            });
        }
    }

    @Post(':id/cancel')
    async cancelPayout(@Param('id') payoutId: string, @Res() res: Response) {
        try {
            const payout = await this.payoutService.cancelPayout(payoutId);
            return res.status(HttpStatus.OK).json({
                message: 'Payout berhasil dibatalkan',
                data: payout,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membatalkan Payout',
                error: error.message,
            });
        }
    }
}