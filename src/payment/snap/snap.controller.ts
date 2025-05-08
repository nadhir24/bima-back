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
  NotFoundException,
  InternalServerErrorException,
  Param,
  Req,
  HttpException,
} from '@nestjs/common';
import { SnapService } from './snap.service';
import { PrismaService } from 'prisma/prisma.service';
import { Response, Request } from 'express';
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
  async createTransaction(
    @Body() payload: any, // Payload now contains userId OR guestId
    @Req() req: Request, 
  ): Promise<any> {
    try {
      console.log('🔍 Request payload:', payload);
      // console.log('👤 Request user:', req.user); // req.user might be null for guests

      // Extract userId and guestId from the payload sent by frontend
      const userId = payload.userId || null; 
      const guestId = payload.guestId || null;
      
      console.log(`👤 Processing transaction for - UserID: ${userId}, GuestID: ${guestId}`);

      // Pass both userId and guestId to the service
      const transaction = await this.snapService.createTransaction(
        userId,
        guestId, // Pass guestId
        payload, // Pass the rest of the payload for details like items, total etc.
        payload.shippingAddress
      );

      console.log('✅ Transaction created:', {
        identifier: userId ? `User ${userId}` : `Guest ${guestId}`,
        orderId: transaction.invoice?.midtransOrderId,
        amount: transaction.invoice?.amount
      });

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      console.error('❌ Error creating transaction in controller:', {
        error: error.message,
        stack: error.stack,
        userId: payload.userId,
        guestId: payload.guestId
      });

      // Re-throw the error or return a more specific error response
      // throw new InternalServerErrorException(error.message || 'Failed to create transaction');
       return {
        success: false,
        message: error.message || 'Failed to create transaction',
        statusCode: error.status || 500
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
        throw new NotFoundException('Invoice tidak ditemukan');
      }

      return {
        success: true,
        data: invoice,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Gagal mengambil detail order');
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
              phoneNumber: true,
            },
          },
        },
      });

      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      throw new InternalServerErrorException('Gagal mengambil daftar order');
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

  @Post('invoice/generate/:orderId')
  async generateInvoice(@Param('orderId') orderId: string) {
    return this.snapService.generateInvoiceManually(orderId);
  }
}
