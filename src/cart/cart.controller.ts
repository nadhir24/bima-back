import { Controller, Post, Get, Put, Delete, Body, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto'; // Ensure you create this DTO

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Add item to cart
  @Post('add')
  async addToCart(
    @Body('userId') userId: string,
    @Body('catalogId') catalogId: string,
    @Body('sizeId') sizeId: string,
    @Body('quantity') quantity: string,
  ) {
    return await this.cartService.addToCart(
      Number(userId), // Convert userId to number
      Number(catalogId), // Convert catalogId to number
      Number(sizeId), // Convert sizeId to number
      Number(quantity), // Convert quantity to number
    );
  }
  

  // Get user's cart
  @Get()
  async getCart(@Request() req) {
    const userId = req.user.id; // Extract userId from request (assumes you are using JWT)
    return await this.cartService.getCart(userId);
  }

  // Update cart item quantity
  @Put(':cartId')
  async updateCartItem(
    @Request() req,
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    const userId = req.user.id; // Extract userId from request
    return await this.cartService.updateCartItem(userId, cartId, quantity);
  }

  // Remove cart item
  @Delete(':cartId')
  async removeCartItem(
    @Request() req,
    @Param('cartId', ParseIntPipe) cartId: number,
  ) {
    const userId = req.user.id; // Extract userId from request
    return await this.cartService.removeCartItem(userId, cartId);
  }
}
