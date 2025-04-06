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
  NotFoundException,
  BadRequestException,
  ValidationPipe,
  HttpException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private formatCartResponse(cart: any) {
    return {
      id: cart.id,
      userId: cart.userId,
      guestId: cart.guestId,
      quantity: cart.quantity,
      createdAt: cart.createdAt.toISOString(),
      user: cart.user ? { id: cart.user.id, email: cart.user.email } : null,
      catalog: cart.catalog ? { id: cart.catalog.id, name: cart.catalog.name, image: cart.catalog.image ? `http://localhost:5000${cart.catalog.image}` : null } : null,
      size: cart.size ? { id: cart.size.id, size: cart.size.size, price: cart.size.price } : null,
    };
  }


  @Get('total')
  async getCartTotalFormatted(@Query('userId') userId: string, @Query('guestId') guestId: string, @Req() req: Request) {
    const parsedUserId = userId ? Number(userId) : null;
    const effectiveGuestId = guestId || req.sessionID;
  
    const totalNumber = await this.cartService.getCartTotal(parsedUserId, effectiveGuestId);
  
  
    // Format total harga menjadi string Rupiah
    const formattedTotal = `Rp${totalNumber.toLocaleString('id-ID')}`;
  
    return formattedTotal;
  }

  @Get('findUnique/:id')
  async findUniqueCart(@Param('id', ParseIntPipe) id: number) {
    const cart = await this.cartService.findUniqueCart({ where: { id }, include: { user: true, catalog: true, size: true } });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.formatCartResponse(cart);
  }

  @Get('findFirst')
  async findFirstCart(@Query('userId') userId: string, @Query('guestId') guestId: string) {
    const parsedUserId = userId ? Number(userId) : undefined;
    const parsedGuestId = guestId || null;
    const cart = await this.cartService.findFirstCart({ where: { OR: [{ userId: parsedUserId }, { guestId: parsedGuestId }] }, include: { user: true, catalog: true, size: true } });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.formatCartResponse(cart);
  }

  @Post('add')
  async addToCart(@Body() createCartDto: CreateCartDto, @Req() req: Request) {
    console.log("Received payload:", createCartDto);
  
    try {
      const guestId = createCartDto.guestId || req.sessionID;
      const cart = await this.cartService.addToCart(
        createCartDto.userId || null,
        guestId,
        createCartDto.catalogId,
        createCartDto.sizeId,
        createCartDto.quantity,
      );
      return this.formatCartResponse(cart);
    } catch (error) {
      console.error("Error in addToCart:", error);
      throw error; // Re-throw error untuk ditangani oleh middleware
    }
  }

  @Put(':cartId')
  async updateCartItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body(new ValidationPipe({ transform: true })) updateCartDto: UpdateCartDto,
    @Req() req: Request,
  ) {
    try {
      if (!cartId) throw new BadRequestException('Cart ID is required');
      if (updateCartDto.quantity === undefined) throw new BadRequestException('Quantity is required for update.');
  
      const userId = updateCartDto.userId || null;
      const guestId = userId ? null : req.sessionID;
  
      const result = await this.cartService.updateCartItem(
        userId, 
        guestId, 
        cartId, 
        updateCartDto.quantity
      );
      
      // Format respons dengan konsisten
      return {
        success: true,
        data: this.formatCartResponse(result)
      };
    } catch (error) {
      // Perbaikan error handling
      console.error("Controller error:", error);
      
      // Return format error yang konsisten
      return {
        success: false,
        message: error.response?.message || error.message || 'Failed to update cart item'
      };
    }
  }
  
  @Delete(':cartId')
  async removeCartItem(@Param('cartId', ParseIntPipe) cartId: number, @Req() req: Request) {
    const userId = req.user?.id || null;
    const guestId = userId ? null : req.sessionID;
    return await this.cartService.removeCartItem(userId, guestId, cartId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('sync')
  async syncCart(
    @Req() req: Request,
    @Body('cart', new ValidationPipe({ transform: true }))
    guestCart: Array<{ catalogId: number; sizeId: number; quantity: number }>,
  ) {
    const userId = (req.user as { id: number }).id;
    const guestId = req.sessionID;
    if (!guestCart?.length) return { message: 'No cart data to sync' };
    return await this.cartService.syncCart(userId, guestId);
  }

  @Get('guest-session')
  getGuestSession(@Req() req: Request, @Res() res: Response) {
    res.send({ guestId: req.sessionID });
  }

  @Get('findMany')
  async findManyCarts(@Req() req: Request) {
    const carts = await this.cartService.findManyCarts({
      include: { user: true, catalog: true, size: true },
    });
    return carts.map((cart) => this.formatCartResponse(cart));
  }
}