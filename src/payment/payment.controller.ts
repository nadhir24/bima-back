import {
  Controller,
  Get,
  Req,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('invoice/notifications')
  async getInvoiceNotifications(@Req() req: any) {
    return this.paymentService.getInvoiceNotifications(Number(req.user.id));
  }

  @Get('invoice/user')
  async getUserInvoices(
    @Query('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      throw new HttpException('Invalid userId', HttpStatus.BAD_REQUEST);
    }
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.paymentService.getUserInvoices(userIdNum, pageNum, limitNum);
  }

  @Get('invoice/guest-list')
  async getGuestInvoices(
    @Query('guestId') guestId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!guestId) {
      throw new HttpException('Guest ID is required', HttpStatus.BAD_REQUEST);
    }
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.paymentService.getGuestInvoices(guestId, pageNum, limitNum);
  }

  @Get('invoice/admin')
  async getAdminInvoices(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    return this.paymentService.getAllInvoices(
      pageNum,
      limitNum,
      search,
      status,
      startDate,
      endDate,
    );
  }
}
