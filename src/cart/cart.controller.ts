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
    // Always use server-side session ID for guests to avoid stale client guestId
    const guestId = !userId ? req?.sessionID : null;

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
      // Always derive guestId from current session for guest users to avoid stale IDs from client
      const guestId = createCartDto.userId ? null : req.sessionID;
      if (!createCartDto.userId && !guestId) {
        throw new BadRequestException('Session ID is required for guest users');
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
      // Enforce guestId from session only when unauthenticated
      const guestId = !userId ? req.sessionID : null;

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

      // Enforce guestId from session only when unauthenticated
      const guestId = !userId ? req.sessionID : null;

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

  @Post('sync')
  @UseGuards(AuthGuard('jwt'))
  async syncCart(
    @Req() req: Request,
    @Body('cart') cartItems: any[],
    @Body('guestId') guestId: string,
    @Body('confirmMerge') confirmMerge?: boolean,
  ) {
    const userId = req.user.id;

    if (!cartItems || !Array.isArray(cartItems)) {
      throw new BadRequestException('Invalid cart data provided.');
    }

    if (!guestId) {
      return { message: 'No guestId provided, nothing to sync or clear.' };
    }

    // Only merge when explicitly confirmed (e.g., right after registration)
    if (confirmMerge === true) {
      return this.cartService.syncCart(userId, guestId, cartItems);
    }

    // If not confirmed, skip merging and just clear the guest cart to avoid leaking items
    await this.cartService.removeManyCarts({ where: { guestId } });
    return { message: 'Guest cart cleared without merging (merge not confirmed).' };
  }

  @Get('guest-session')
  async getGuestSession(@Req() req: Request, @Res() res: Response) {
    try {
      // This is the definitive entry point for a guest.
      // We will create the session and clean any associated cart here.
      const guestId = req.sessionID;

      // Mark as guest
      req.session.isGuest = true;

      // Clean any existing cart items for this session ID.
      // This is crucial for ensuring a fresh start.
      await this.cartService.removeManyCarts({ where: { guestId } });

      // Return the guestId to the client.
      res.status(HttpStatus.OK).send({
        guestId: guestId,
        message: 'Guest session created and cart cleared.',
      });
    } catch (error) {
      console.error('Failed to create guest session:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Failed to create guest session.',
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
    // Ignore client-provided guestId; rely on current session only
    const guestId = !userId ? req?.sessionID : null;

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
    // Prevent using stale guestId from client; always use sessionID
    const guestId = !userId ? req?.sessionID : null;

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
      // Selalu gunakan sessionID server untuk identitas guest saat menghapus cart
      const guestId = req.sessionID;
      
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
