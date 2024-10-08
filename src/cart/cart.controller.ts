// src/cart/cart.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  async addToCart(
    @Body('userId') userId: number,
    @Body('catalogId') catalogId: number,
    @Body('sizeId') sizeId: number,
    @Body('quantity') quantity: number,
  ) {
    return await this.cartService.addToCart(
      userId,
      catalogId,
      sizeId,
      quantity,
    );
  }
  @Get(':userId')
  async getCart(@Param('userId') userId: number) {
    return await this.cartService.getCart(userId);
  }



  @Patch('update/:cartId')
  async updateCartItem(
    @Param('cartId') cartId: number,
    @Body('userId') userId: number,
    @Body('quantity') quantity: number,
  ) {
    return await this.cartService.updateCartItem(userId, cartId, quantity);
  }

  @Delete('remove/:cartId')
  async removeCartItem(
    @Param('cartId') cartId: number,
    @Body('userId') userId: number,
  ) {
    return await this.cartService.removeCartItem(userId, cartId);
  }
}
