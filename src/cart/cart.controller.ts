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
  HttpStatus,
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
      catalog: cart.catalog
        ? {
            id: cart.catalog.id,
            name: cart.catalog.name,
            image: cart.catalog.image
              ? cart.catalog.image
              : null,
          }
        : null,
      size: cart.size
        ? { id: cart.size.id, size: cart.size.size, price: cart.size.price }
        : null,
    };
  }
  @Get()
  async findAllCart() {
    return this.cartService.FindAllCart();
  }

  @Get('total')
  async getCartTotalFormatted(
    @Query('userId') userIdQuery?: string,
    @Query('guestId') guestIdQuery?: string,
    @Req() req?: Request,
  ) {
    let userId = userIdQuery ? parseInt(userIdQuery, 10) : null;
    const guestId = !userId ? guestIdQuery || req?.sessionID : null;

    if (!userId && !guestId) {
      return 'Rp0';
    }

    const totalNumber = await this.cartService.getCartTotal(userId, guestId);

    const formattedTotal = `Rp${totalNumber.toLocaleString('id-ID')}`;

    return formattedTotal;
  }

  @Get('findUnique/:id')
  async findUniqueCart(@Param('id', ParseIntPipe) id: number) {
    const cart = await this.cartService.findUniqueCart({
      where: { id },
      include: { user: true, catalog: true, size: true },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.formatCartResponse(cart);
  }

  @Get('findFirst')
  async findFirstCart(
    @Query('userId') userId: string,
    @Query('guestId') guestId: string,
  ) {
    const parsedUserId = userId ? Number(userId) : undefined;
    const parsedGuestId = guestId || null;
    const cart = await this.cartService.findFirstCart({
      where: { OR: [{ userId: parsedUserId }, { guestId: parsedGuestId }] },
      include: { user: true, catalog: true, size: true },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.formatCartResponse(cart);
  }

  @Post('add')
  async addToCart(@Body() createCartDto: CreateCartDto, @Req() req: Request) {
    try {
      let guestId = createCartDto.guestId;
      if (!createCartDto.userId && !guestId) {
        guestId = req.sessionID;
        if (!guestId) {
          throw new BadRequestException(
            'Session ID is required for guest users',
          );
        }
      }

      if (
        !createCartDto.catalogId ||
        !createCartDto.sizeId ||
        createCartDto.quantity <= 0
      ) {
        throw new BadRequestException('Invalid input data');
      }

      const cart = await this.cartService.addToCart(
        createCartDto.userId || null,
        guestId,
        createCartDto.catalogId,
        createCartDto.sizeId,
        createCartDto.quantity,
      );

      return {
        success: true,
        data: this.formatCartResponse(cart),
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.message ||
          error.message ||
          'Failed to add item to cart',
      };
    }
  }

  @Put(':cartId')
  async updateCartItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body(new ValidationPipe({ transform: true })) updateCartDto: UpdateCartDto,
    @Req() req: Request,
    @Query('guestId') guestIdParam?: string,
  ) {
    try {
      if (!cartId) throw new BadRequestException('Cart ID is required');
      if (updateCartDto.quantity === undefined)
        throw new BadRequestException('Quantity is required for update.');

      const userId = updateCartDto.userId || null;
      const guestId =
        !userId && guestIdParam ? guestIdParam : !userId ? req.sessionID : null;

      const result = await this.cartService.updateCartItem(
        userId,
        guestId,
        cartId,
        updateCartDto.quantity,
      );

      if ('message' in result && 'deletedItem' in result) {
        return {
          success: true,
          data: {
            ...this.formatCartResponse(result.deletedItem),
            message: result.message,
          },
        };
      } else {
        return {
          success: true,
          data: this.formatCartResponse(result),
        };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.message ||
          error.message ||
          'Failed to update cart item',
        statusCode: error.status || 500,
      };
    }
  }

  @Delete(':cartId')
  async removeCartItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Req() req: Request,
    @Query('userId') userIdParam?: string,
    @Query('guestId') guestIdParam?: string,
  ) {
    try {
      let userId: number | null = null;
      if (userIdParam) {
        userId = parseInt(userIdParam, 10);
      } else if (req.user && 'id' in req.user) {
        userId = (req.user as any).id;
      }

      const guestId =
        !userId && guestIdParam ? guestIdParam : !userId ? req.sessionID : null;

      const result = await this.cartService.removeCartItem(
        userId,
        guestId,
        cartId,
      );
      return {
        success: true,
        message: result.message,
        data: this.formatCartResponse(result.deletedItem),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to remove cart item',
        statusCode: error.status || 500,
      };
    }
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
  async getGuestSession(@Req() req: Request, @Res() res: Response) {
    const guestId = req.sessionID;
    
    try {
      // Langkah 1: Delete semua item keranjang untuk guest ID ini
      await this.cartService.removeManyCarts({
        where: { guestId: guestId }
      });
      
      // Langkah 2: Verifikasi semua item sudah terhapus dengan membaca ulang
      const remainingItems = await this.cartService.findManyCarts({
        where: { guestId: guestId }
      });
      
      // Jika masih ada item tersisa, paksa hapus sekali lagi
      if (remainingItems.length > 0) {
        console.warn(`Found ${remainingItems.length} remaining items after cleanup for guestId=${guestId}, forcing delete again`);
        await this.cartService.removeManyCarts({
          where: { guestId: guestId }
        });
      }
      
      // Langkah 3: Return the guest ID
      res.send({ 
        guestId: guestId,
        isClean: true, 
        message: "New guest session created with empty cart" 
      });
    } catch (error) {
      // Jika terjadi error saat pembersihan, tetap kirim guestId tetapi beri tahu klien
      console.error(`Error cleaning up cart for guestId=${guestId}:`, error);
      res.status(200).send({ 
        guestId: guestId,
        isClean: false,
        message: "Guest session created but cart cleanup might be incomplete" 
      });
    }
  }

  @Get('count')
  async getCartItemCount(
    @Query('userId') userIdQuery?: string,
    @Query('guestId') guestIdQuery?: string,
    @Req() req?: Request,
  ) {
    let userId = userIdQuery ? parseInt(userIdQuery, 10) : null;
    const guestId = !userId ? guestIdQuery || req?.sessionID : null;

    if (!userId && !guestId) {
      return { count: 0 };
    }

    const count = await this.cartService.getCartItemCount(userId, guestId);
    return { count };
  }

  @Get('findMany')
  async findManyCartsEndpoint(
    @Query('userId') userIdQuery?: string,
    @Query('guestId') guestIdQuery?: string,
    @Req() req?: Request,
  ) {
    let userId = userIdQuery ? parseInt(userIdQuery, 10) : null;
    const guestId = !userId ? guestIdQuery || req?.sessionID : null;

    if (!userId && !guestId) {
      return [];
    }

    const whereClause = userId ? { userId: userId } : { guestId: guestId };

    const carts = await this.cartService.findManyCarts({
      where: whereClause,
      include: { user: true, catalog: true, size: true },
      orderBy: { createdAt: 'asc' },
    });
    return carts.map((cart) => this.formatCartResponse(cart));
  }

  @Delete('admin/remove-all-by-catalog/:catalogId')
  async removeAllCartItemsByCatalog(
    @Param('catalogId', ParseIntPipe) catalogId: number,
  ) {
    try {
      if (!catalogId) {
        throw new BadRequestException('Catalog ID is required');
      }

      const result =
        await this.cartService.removeAllCartItemsByCatalogId(catalogId);

      return {
        success: true,
        message: result.message,
        count: result.count,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.message || 'Failed to remove cart items for this product',
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  @Delete('admin/cleanup-expired-sessions')
  async cleanupExpiredSessions(@Query('days') days?: string) {
    try {
      const daysToKeep = days ? parseInt(days, 10) : 30;
      const count = await this.cartService.cleanupExpiredGuestSessions(daysToKeep);
      
      return {
        success: true,
        message: `Successfully removed ${count} expired guest cart items`,
        count: count,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to clean up expired guest sessions',
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Endpoint baru untuk menghapus semua item di keranjang guest secara otomatis
  @Delete('clear-guest-cart')
  async clearGuestCart(@Req() req: Request, @Query('guestId') guestIdParam?: string) {
    try {
      // Prioritaskan guestId dari query dulu, jika tidak ada gunakan sessionID
      const guestId = guestIdParam || req.sessionID;
      
      if (!guestId) {
        throw new BadRequestException('Guest ID is required');
      }
      
      // Hapus semua item keranjang untuk guestId ini
      const result = await this.cartService.removeManyCarts({
        where: { guestId }
      });
      
      return {
        success: true,
        message: `Successfully cleared guest cart with ${result.count} items`,
        count: result.count
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to clear guest cart',
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }
}
