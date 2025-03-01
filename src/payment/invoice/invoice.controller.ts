import { Controller, Post, Get, Param, Body, Query, Res, HttpStatus, UsePipes, ValidationPipe, Req, UseGuards } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { Response, Request } from 'express';
import { CreateInvoiceDto } from '../dto/create-invoice.dto'; // Import DTO
import { ListInvoicesDto } from '../dto/list-invoice.dto'; // Import DTO
import { AuthGuard } from '@nestjs/passport';

@Controller('payment/invoice')
@UseGuards(AuthGuard('jwt')) // Proteksi endpoint dengan JWT Auth
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) {}

    @Post()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: Request, @Res() res: Response) { // ✅ Tambahkan @Req() req
        try {
            const userId = (req.user as any).id; // ✅ Ambil userId dari req.user
            // 👇👇👇 PEMANGGILAN invoiceService.createInvoice DENGAN 2 ARGUMEN: userId dan createInvoiceDto 👇👇👇
            const invoice = await this.invoiceService.createInvoice(userId, createInvoiceDto); // ✅ Berikan userId dan createInvoiceDto
            // 👆👆👆 PEMANGGILAN invoiceService.createInvoice DENGAN 2 ARGUMEN: userId dan createInvoiceDto 👆👆👆
            return res.status(HttpStatus.CREATED).json({
                message: 'Invoice berhasil dibuat!',
                data: invoice,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membuat invoice',
                error: error.message,
            });
        }
    }

    @Get(':id')
    async getInvoiceById(@Param('id') invoiceId: string, @Res() res: Response) {
        try {
            const invoice = await this.invoiceService.getInvoiceById(invoiceId);
            if (!invoice) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: 'Invoice tidak ditemukan',
                });
            }
            return res.status(HttpStatus.OK).json({
                data: invoice,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan invoice',
                error: error.message,
            });
        }
    }

    @Get()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async listInvoices(@Query() queryParams: ListInvoicesDto, @Res() res: Response) { // Gunakan DTO
        try {
            const invoices = await this.invoiceService.listInvoices(queryParams);
            return res.status(HttpStatus.OK).json({
                data: invoices,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan daftar invoice',
                error: error.message,
            });
        }
    }

    @Post(':id/cancel')
    async cancelInvoice(@Param('id') invoiceId: string, @Res() res: Response) {
        try {
            const invoice = await this.invoiceService.cancelInvoice(invoiceId);
            return res.status(HttpStatus.OK).json({
                message: 'Invoice berhasil dibatalkan',
                data: invoice,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membatalkan invoice',
                error: error.message,
            });
        }
    }
}