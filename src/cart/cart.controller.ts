import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express'; // Import dari express

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  async addToCart(
    @Body('userId') userId: number | null,
    @Body('catalogId') catalogId: number,
    @Body('sizeId') sizeId: number,
    @Body('quantity') quantity: number,
    @Req() req: Request, // Type sudah benar
  ) {
    const guestId = req.sessionID;
    return await this.cartService.addToCart(
      userId,
      guestId,
      catalogId,
      sizeId,
      quantity,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('sync')
  async syncCart(
    @Req() req: Request, // Tambahkan type Request
    @Body('cart')
    guestCart: Array<{
      catalogId: number;
      sizeId: number;
      quantity: number;
    }>,
  ) {
    const userId = (req.user as { id: number }).id; // Type assertion untuk user
    if (!guestCart?.length) return { message: 'No cart data to sync' };
    return await this.cartService.syncCart(userId, guestCart);
  }

  @Get('guest-session')
  getGuestSession(@Req() req: Request, @Res() res: Response) {
    res.send({ guestId: req.sessionID });
  }

  @Get('findAll')
  async getCart(
    @Query('userId') userId: number | null,
    @Query('guestId') guestId: string | null,
    @Req() req: Request,
  ) {
    if (!guestId) guestId = req.sessionID;
    return await this.cartService.getCart(userId, guestId);
  }

  @Put(':cartId')
  async updateCartItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
    @Body('userId') userId: number | null,
    @Body('guestId') guestId: string | null,
  ) {
    return await this.cartService.updateCartItem(
      userId,
      guestId,
      cartId,
      quantity,
    );
  }

  @Delete(':cartId')
  async removeCartItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body('userId') userId: number | null,
    @Body('guestId') guestId: string | null,
  ) {
    return await this.cartService.removeCartItem(userId, guestId, cartId);
  }
}