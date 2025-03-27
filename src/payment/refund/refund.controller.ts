import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto } from '../interfaces/refund.interface';

@Controller('payment/refund')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  async createRefund(@Body() dto: CreateRefundDto) {
    try {
      return await this.refundService.createRefund(dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create refund',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':refundId/status')
  async getRefundStatus(@Param('refundId') refundId: string) {
    try {
      return await this.refundService.getRefundStatus(refundId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get refund status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
