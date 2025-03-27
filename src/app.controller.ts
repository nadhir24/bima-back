import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('success')
  successRedirect() {
    return 'Pembayaran berhasil! Terima kasih telah berbelanja.';
  }

  @Get('failure')
  failureRedirect() {
    return 'Pembayaran gagal. Silakan coba lagi.';
  }
}

