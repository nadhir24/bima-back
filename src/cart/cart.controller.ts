import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart as CartModel, Prisma } from '@prisma/client';

@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  async addToCart(
    @Body('userId') userId: number,
    @Body('catalogId') catalogId: number,
    @Body('quantity') quantity: number,
  ): Promise<any> {
    try {
      const result = await this.cartService.addToCart(
        userId,
        catalogId,
        quantity,
      );
      return { message: 'Item added to cart successfully', cartItem: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Get()
  async findAll(): Promise<CartModel[]> {
    try {
      return await this.cartService.findAll();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CartModel> {
    try {
      return await this.cartService.findOne(Number(id));
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCartDto: Prisma.CartUpdateInput,
  ): Promise<CartModel> {
    try {
      return await this.cartService.update(Number(id), updateCartDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.cartService.remove(Number(id));
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
