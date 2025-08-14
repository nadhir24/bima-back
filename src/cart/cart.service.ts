import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Cart } from '@prisma/client';

type CartWithRelations = Cart & {
  catalog: {
    id: number;
    name: string;
    image?: string | null;
    [key: string]: any;
  } | null;
  size: {
    id: number;
    size: string;
    price: string;
    qty?: number;
    [key: string]: any;
  } | null;
  user?: {
    id: number;
    email: string;
    [key: string]: any;
  } | null;
};

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async findManyCarts(
    params: Prisma.CartFindManyArgs,
  ): Promise<CartWithRelations[]> {
    const where = params.where || {};

    if (where.userId && typeof where.userId === 'string') {
      where.userId = parseInt(where.userId, 10);

      if (isNaN(where.userId)) {
        throw new Error('Invalid userId: not a number');
      }
    }

    const include = {
      catalog: true,
      size: true,
      user: true,
      ...(params.include || {}),
    };

    if (
      include.size &&
      typeof include.size === 'object' &&
      include.size.select
    ) {
      delete include.size.select;
      include.size = true;
    }

    return this.prisma.cart.findMany({
      where,
      include,
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.skip && { skip: params.skip }),
      ...(params.take && { take: params.take }),
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.distinct && { distinct: params.distinct }),
    });
  }
  async FindAllCart() {
    return this.prisma.cart.findMany({
      include: {
        catalog: true,
        size: true,
      },
    });
  }

  async addToCart(
    userId: number | null,
    guestId: string | null,
    catalogId: number,
    sizeId: number,
    quantity: number,
  ): Promise<Cart> {
    try {
      if (!catalogId || !sizeId || quantity <= 0) {
        throw new BadRequestException('Invalid input data');
      }

      if (userId === null && !guestId) {
        throw new BadRequestException('Either userId or guestId is required');
      }

      let whereClause: Prisma.CartFindFirstArgs['where'];
      if (userId) {
        whereClause = { userId: userId, catalogId, sizeId };
      } else if (guestId) {
        whereClause = { guestId: guestId, catalogId, sizeId };
      } else {
        throw new BadRequestException('Invalid identifier state');
      }

      const existingCart = await this.prisma.cart.findFirst({
        where: whereClause,
      });

      if (existingCart) {
        return this.prisma.cart.update({
          where: { id: existingCart.id },
          data: { quantity: existingCart.quantity + quantity },
          include: {
            catalog: true,
            size: true,
          },
        });
      }

      return this.prisma.cart.create({
        data: {
          userId,
          guestId,
          catalogId,
          sizeId,
          quantity,
        },
        include: {
          catalog: true,
          size: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new HttpException(
          `Database error: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async findUniqueCart(
    params: Prisma.CartFindUniqueArgs,
  ): Promise<Cart | null> {
    return this.prisma.cart.findUnique(params);
  }

  async findFirstCart(params: Prisma.CartFindFirstArgs): Promise<Cart | null> {
    return this.prisma.cart.findFirst(params);
  }

  async updateCartItem(
    userId: number | null,
    guestId: string | null,
    cartId: number,
    quantity: number,
  ): Promise<Cart | { message: string; deletedItem: Cart }> {
    const prisma = this.prisma;
    if (quantity <= 0) return this.removeCartItem(userId, guestId, cartId);

    try {
      const cartItem = await prisma.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: { size: true, catalog: true },
      });

      this.authorizeCartAccess(cartItem, userId, guestId);

      if (cartItem.size?.qty !== undefined && quantity > cartItem.size.qty) {
        throw new HttpException(
          `Insufficient stock for ${cartItem.catalog?.name || 'item'} (${cartItem.size.size}). Available: ${cartItem.size.qty}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedCart = await prisma.cart.update({
        where: { id: cartId },
        data: { quantity },
        include: { catalog: true, size: true, user: true },
      });

      return updatedCart;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new HttpException(
          `Database error: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      } else {
        throw new HttpException(
          'Failed to update cart item',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async removeCartItem(
    userId: number | null,
    guestId: string | null,
    cartId: number,
  ): Promise<{ message: string; deletedItem: Cart }> {
    return this.prisma.$transaction(async (prisma) => {
      const cartItem = await prisma.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: { catalog: true, size: true },
      });
      this.authorizeCartAccess(cartItem, userId, guestId);

      await prisma.$executeRaw`
        UPDATE "sizes"
        SET qty = COALESCE(qty, 0) + ${cartItem.quantity}
        WHERE id = ${cartItem.sizeId}
      `;

      await prisma.cart.delete({ where: { id: cartId } });

      return {
        message: 'Cart item deleted successfully.',
        deletedItem: cartItem,
      };
    });
  }

  async syncCart(
    userId: number,
    guestId: string, // guestId from session
    cartItems: any[],
  ): Promise<{ message: string }> {
    // 1. Sync all items from guest cart to user cart
    await Promise.all(
      cartItems.map(async (item) => {
        if (item.catalog?.id && item.size?.id && item.quantity) {
          await this.addToCart(
            userId,
            null, // guestId is null because we are assigning to a user
            item.catalog.id,
            item.size.id,
            item.quantity,
          );
        }
      }),
    );

    // 2. If guestId exists, delete all cart items associated with it
    if (guestId) {
      await this.removeManyCarts({ where: { guestId } });
    }

    return { message: 'Cart synced and guest cart cleared successfully' };
  }

  async removeManyCarts(
    params: Prisma.CartDeleteManyArgs,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.cart.deleteMany(params);
  }

  private authorizeCartAccess(
    cartItem: Cart,
    userId: number | null,
    guestId: string | null,
  ): void {
    const adminUserIds = [1, 6];
    const isAdmin = userId !== null && adminUserIds.includes(userId);

    if (isAdmin) {
      return;
    }

    if (
      (userId && cartItem.userId !== userId) ||
      (!userId && guestId && cartItem.guestId !== guestId)
    ) {
      throw new ForbiddenException('Unauthorized access to cart item.');
    }
  }

  async getCartItemCount(
    userId: number | null,
    guestId: string | null,
  ): Promise<number> {
    try {
      // Important: do NOT use OR with userId=null, it will match all guest rows
      const where = userId !== null
        ? { userId }
        : { guestId: guestId || undefined };

      const aggregateResult = await this.prisma.cart.aggregate({
        _sum: { quantity: true },
        where,
      });
      return aggregateResult._sum.quantity ?? 0;
    } catch (error) {
      throw new HttpException(
        'Failed to get cart item count',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCartTotal(
    userId: number | null,
    guestId: string | null,
  ): Promise<number> {
    try {
      // Important: when guest, filter strictly by session guestId
      const where = userId !== null
        ? { userId }
        : { guestId: guestId || undefined };

      const cartItems = await this.findManyCarts({
        where,
        include: { size: true },
      });

      if (!cartItems || cartItems.length === 0) {
        return 0;
      }

      const total = cartItems.reduce((accumulator, item) => {
        const priceString = item.size.price || '0';

        const numericPrice = Number(priceString.replace(/Rp|\./g, ''));

        return accumulator + numericPrice * item.quantity;
      }, 0);

      return total;
    } catch (error) {
      throw new HttpException(
        'Failed to calculate cart total',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeAllCartItemsByCatalogId(catalogId: number) {
    try {
      const cartItems = await this.prisma.cart.findMany({
        where: { catalogId },
        include: {
          catalog: {
            select: { name: true },
          },
        },
      });

      if (cartItems.length === 0) {
        return {
          message: 'No cart items found for this catalog',
          count: 0,
        };
      }

      const deleteResult = await this.prisma.cart.deleteMany({
        where: { catalogId },
      });

      return {
        message: `Successfully removed ${deleteResult.count} cart items for product: ${cartItems[0]?.catalog?.name || catalogId}`,
        count: deleteResult.count,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to remove cart items for this catalog',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cleanupExpiredGuestSessions(olderThanDays: number = 30): Promise<number> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - olderThanDays);
      
      const result = await this.prisma.cart.deleteMany({
        where: {
          userId: null,
          guestId: { not: null },
          createdAt: { lt: date }
        }
      });
      
      return result.count;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to clean up expired guest sessions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
