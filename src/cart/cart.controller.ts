import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Request,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from '@nestjs/passport';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Menambahkan item ke keranjang
  @Post('add')
  async addToCart(
    @Body('userId') userId: number | null,
    @Body('catalogId') catalogId: number,
    @Body('sizeId') sizeId: number,
    @Body('quantity') quantity: number,
    @Req() req: Request, // Mengakses session
  ) {
    let guestId = req.session.guestId;

    if (!guestId) {
      guestId = uuidv4();
      req.session.guestId = guestId; // Menyimpan guestId baru ke session
    }

    return await this.cartService.addToCart(
      userId,
      guestId,
      catalogId,
      sizeId,
      quantity,
    );
  }

  @UseGuards(AuthGuard('jwt')) // Gunakan JWT untuk memastikan user login
  @Post('sync')
  async syncCart(
    @Req() req, // Ambil user dari token
    @Body('cart')
    guestCart: Array<{
      catalogId: number;
      sizeId: number;
      quantity: number;
    }>, // Struktur cart dari frontend
  ) {
    const userId = req.user.id; // Dapatkan userId dari token JWT

    if (!guestCart || guestCart.length === 0) {
      return { message: 'No cart data to sync' };
    }

    return await this.cartService.syncCart(userId, guestCart);
  }
  @Get('guest-session')
  getGuestSession(@Req() req: Request, @Res() res: Response) {
    let guestId = req.session.guestId;

    if (!guestId) {
      guestId = uuidv4();
      req.session.guestId = guestId; // Save guestId to session
    }

    res.send({ guestId });
  }

  // Mendapatkan data cart, menggunakan session untuk guestId
  @Get('findAll')
  async getCart(
    @Query('userId') userId: number | null,
    @Query('guestId') guestId: string | null,
    @Req() req: Request,
  ) {
    // Jika guestId tidak ada, gunakan session untuk mengambil guestId
    if (!guestId) {
      guestId = req.session.guestId;
    }

    // Periksa apakah guestId masih tidak ada, jika ya, buat guestId baru
    if (!guestId) {
      guestId = uuidv4(); // UUID baru dibuat
      req.session.guestId = guestId; // Menyimpan guestId ke session
    }

    return await this.cartService.getCart(userId, guestId);
  }

  // Memperbarui jumlah item di keranjang
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

  // Menghapus item dari keranjang
  @Delete(':cartId')
  async removeCartItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body('userId') userId: number | null,
    @Body('guestId') guestId: string | null,
  ) {
    return await this.cartService.removeCartItem(userId, guestId, cartId);
  }
}
