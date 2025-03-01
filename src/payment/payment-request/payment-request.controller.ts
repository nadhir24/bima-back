import { Controller, Post, Get, Param, Body, Query, Res, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentRequestService } from './payment-request.service';
import { Response } from 'express';
import { CreatePaymentRequestDto } from '../dto/create-payment-request.dto'; // Import DTO
import { ListPaymentRequestsDto } from '../dto/list-payment-request.dto'; // Import DTO

@Controller('payment/payment-request')
export class PaymentRequestController {
    constructor(private readonly paymentRequestService: PaymentRequestService) {}

    @Post()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async createPaymentRequest(@Body() createPaymentRequestDto: CreatePaymentRequestDto, @Res() res: Response) { // Gunakan DTO
        try {
            const paymentRequest = await this.paymentRequestService.createPaymentRequest(createPaymentRequestDto);
            return res.status(HttpStatus.CREATED).json({
                message: 'Payment Request berhasil dibuat!',
                data: paymentRequest,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membuat Payment Request',
                error: error.message,
            });
        }
    }

    @Get(':id')
    async getPaymentRequestById(@Param('id') paymentRequest: string, @Res() res: Response) {
        try {
            const paymentRequestData = await this.paymentRequestService.getPaymentRequestById(paymentRequest);
            if (!paymentRequestData) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: 'Payment Request tidak ditemukan',
                });
            }
            return res.status(HttpStatus.OK).json({
                data: paymentRequestData,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan Payment Request',
                error: error.message,
            });
        }
    }

    @Get()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async listPaymentRequests(@Query() queryParams: ListPaymentRequestsDto, @Res() res: Response) { // Gunakan DTO
        try {
            const paymentRequests = await this.paymentRequestService.listPaymentRequests(queryParams);
            return res.status(HttpStatus.OK).json({
                data: paymentRequests,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan daftar Payment Request',
                error: error.message,
            });
        }
    }

    @Post(':id/expire')
    async expirePaymentRequest(@Param('id') paymentRequest: string, @Res() res: Response) {
        try {
            const paymentRequestData = await this.paymentRequestService.expirePaymentRequest(paymentRequest);
            return res.status(HttpStatus.OK).json({
                message: 'Payment Request berhasil dibatalkan',
                data: paymentRequestData,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membatalkan Payment Request',
                error: error.message,
            });
        }
    }
}