import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { SnapService } from './snap.service';
import { PrismaService } from 'prisma/prisma.service';

@Controller('payment/snap')
export class SnapController {
  constructor(
    private readonly snapService: SnapService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Endpoint untuk membuat transaksi baru.
   */
  @Post('create-transaction')
  @HttpCode(HttpStatus.OK)
  async createTransaction(@Body() payload: any): Promise<any> {
    try {
      const userId = payload.userId || null; // Ambil userId jika ada
      const transaction = await this.snapService.createTransaction(
        userId,
        payload,
      );
      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Endpoint untuk menangani webhook dari Midtrans.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('X-Callback-Signature') signature: string,
  ): Promise<any> {
    try {
      const result = await this.snapService.handleWebhook(body, signature);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('redirect/success')
  @HttpCode(HttpStatus.FOUND)
  async handleSuccess(@Res() res) {
    // Use environment variable for redirect URL instead of hardcoded value
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/checkout/sukses`);
  }

  @Get('redirect/error')
  @HttpCode(HttpStatus.FOUND)
  async handleError(@Res() res) {
    // Use environment variable for redirect URL instead of hardcoded value
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/checkout/gagal`);
  }

  // Tambahkan endpoint untuk mendapatkan detail order
  @Get('order-detail')
  async getOrderDetail(@Query('orderId') orderId: string) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { midtransOrderId: orderId },
        include: {
          items: true,
          user: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      });

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice tidak ditemukan',
        };
      }

      return {
        success: true,
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
