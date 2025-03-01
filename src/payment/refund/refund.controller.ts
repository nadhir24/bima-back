import { Controller, Post, Get, Param, Body, Query, Res, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { RefundService } from './refund.service';
import { Response } from 'express';
import { CreateRefundDto } from '../dto/create-refund.dto'; // Import DTO
import { ListRefundsDto } from '../dto/list-refund.dto'; // Import DTO

@Controller('payment/refund')
export class RefundController {
    constructor(private readonly refundService: RefundService) {}

    @Post(':paymentId')
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async createRefund(
        @Param('paymentId') paymentId: string,
        @Body() createRefundDto: CreateRefundDto,
        @Res() res: Response
    ) {
        try {
            const refund = await this.refundService.createRefund(Number(paymentId), createRefundDto);
            return res.status(HttpStatus.CREATED).json({
                message: 'Refund berhasil dibuat!',
                data: refund,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membuat Refund',
                error: error.message,
            });
        }
    }

    @Get(':id')
    async getRefundById(@Param('id') refundId: string, @Res() res: Response) {
        try {
            const refund = await this.refundService.getRefundById(refundId);
            if (!refund) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: 'Refund tidak ditemukan',
                });
            }
            return res.status(HttpStatus.OK).json({
                data: refund,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan Refund',
                error: error.message,
            });
        }
    }

    @Get()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async listRefunds(@Query() queryParams: ListRefundsDto, @Res() res: Response) { // Gunakan DTO
        try {
            const refunds = await this.refundService.listRefunds(queryParams);
            return res.status(HttpStatus.OK).json({
                data: refunds,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan daftar Refund',
                error: error.message,
            });
        }
    }
}