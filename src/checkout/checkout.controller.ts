import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto'; // Kita buat DTO nanti

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @UsePipes(new ValidationPipe()) // Validasi input otomatis
  checkout(@Body() createCheckoutDto: CreateCheckoutDto) {
    return this.checkoutService.createPaymentRequest(createCheckoutDto); // Panggil service untuk buat Pay Request
  }
}