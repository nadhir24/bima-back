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
  UseGuards,
} from '@nestjs/common';
import { SnapService } from './snap.service';
import { PrismaService } from 'prisma/prisma.service';
import { Response } from 'express';
//di appmodule
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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any): Promise<any> {
    try {
      const result = await this.snapService.handleWebhook(body); // Signature di-handle di service
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
  async handleSuccess(@Query('order_id') orderId: string, @Res() res) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/checkout/sukses?order_id=${orderId}`);
  }

  @Get('redirect/error')
  handleError(@Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/checkout/gagal`);
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

  @Get('orders')
  async getAllOrders() {
    try {
      const orders = await this.prisma.invoice.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          items: true,
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

      return orders;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Tambahkan endpoint untuk cek order guest
  @Get('guest-order')
  async getGuestOrder(
    @Query('orderId') orderId: string,
    @Query('email') email: string,
  ) {
    try {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          midtransOrderId: orderId,
          user: null, // Pastikan ini adalah order guest
          items: {
            some: {
              name: {
                not: 'Biaya Pengiriman'
              }
            }
          }
        },
        include: {
          items: true,
          payment: true
        }
      });

      if (!invoice) {
        return {
          success: false,
          message: 'Order tidak ditemukan atau bukan order guest',
        };
      }

      return {
        success: true,
        data: {
          orderId: invoice.midtransOrderId,
          status: invoice.status,
          amount: invoice.amount,
          currency: invoice.currency,
          createdAt: invoice.createdAt,
          items: invoice.items,
          payment: invoice.payment
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
