import {
    Controller,
    Post,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { SnapService } from './snap.service';
  
  @Controller('payment/snap')
  export class SnapController {
    constructor(private readonly snapService: SnapService) {}
  
    /**
     * Endpoint untuk membuat transaksi baru.
     */
    @Post('create-transaction')
    @HttpCode(HttpStatus.OK)
    async createTransaction(@Body() payload: any): Promise<any> {
      try {
        const userId = payload.userId || null; // Ambil userId jika ada
        const transaction = await this.snapService.createTransaction(userId, payload);
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
  }