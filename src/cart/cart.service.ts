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

    // Jika userId ada dan bertipe string, ubah ke number
    if (where.userId && typeof where.userId === 'string') {
      where.userId = parseInt(where.userId, 10);

      // Validasi apakah parsing berhasil
      if (isNaN(where.userId)) {
        throw new Error('Invalid userId: not a number');
      }
    }

    // Pastikan include size mengambil semua field termasuk qty
    const include = {
      catalog: true,
      size: true, // Ini akan otomatis include semua field size termasuk qty
      user: true, // Include user juga jika diperlukan
      ...(params.include || {}),
    };

    // Hapus select jika ada, agar semua field size diambil oleh include: true
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
      // Validasi input
      if (!catalogId || !sizeId || quantity <= 0) {
        throw new BadRequestException('Invalid input data');
      }

      // Pastikan minimal userId atau guestId ada
      if (userId === null && !guestId) {
        throw new BadRequestException('Either userId or guestId is required');
      }

      // Construct the where clause based on identifier
      let whereClause: Prisma.CartFindFirstArgs['where'];
      if (userId) {
        whereClause = { userId: userId, catalogId, sizeId };
      } else if (guestId) {
        whereClause = { guestId: guestId, catalogId, sizeId };
      } else {
        // This case should ideally not be reached due to the check above
        throw new BadRequestException('Invalid identifier state');
      }

      // Cek apakah item sudah ada di cart using the specific clause
      const existingCart = await this.prisma.cart.findFirst({
        where: whereClause,
      });

      if (existingCart) {
        // Update quantity jika item sudah ada
        return this.prisma.cart.update({
          where: { id: existingCart.id },
          data: { quantity: existingCart.quantity + quantity },
          include: {
            catalog: true,
            size: true,
          },
        });
      }

      // Buat cart item baru
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
      console.error('Error in addToCart service:', error);
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
      // Ambil data cart dengan catalog dan size
      const cartItem = await prisma.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: { size: true, catalog: true },
      });

      this.authorizeCartAccess(cartItem, userId, guestId);

      // Validasi stok yang benar
      if (cartItem.size?.qty !== undefined && quantity > cartItem.size.qty) {
        // Perbaikan: gunakan cartItem.catalog.name, bukan CatalogItem.name
        throw new HttpException(
          `Insufficient stock for ${cartItem.catalog?.name || 'item'} (${cartItem.size.size}). Available: ${cartItem.size.qty}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update cart dan return data lengkap
      const updatedCart = await prisma.cart.update({
        where: { id: cartId },
        data: { quantity },
        include: { catalog: true, size: true, user: true },
      });

      return updatedCart;
    } catch (error) {
      console.error('Error in updateCartItem:', error);

      // Perbaikan error handling
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
    guestId: string,
  ): Promise<{ message: string }> {
    const guestCarts = await this.findManyCarts({ where: { guestId } });
    await Promise.all(
      guestCarts.map(async (guestCart) => {
        await this.addToCart(
          userId,
          null,
          guestCart.catalogId,
          guestCart.sizeId,
          guestCart.quantity,
        );
        await this.prisma.cart.delete({ where: { id: guestCart.id } });
      }),
    );
    return { message: 'Cart synced successfully' };
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
    // Admin check - customize this based on your admin role implementation
    // If your admins have specific IDs (like 1, 6, etc), you can add them here
    const adminUserIds = [1, 6]; // Contoh: user id 1 dan 6 adalah admin
    const isAdmin = userId !== null && adminUserIds.includes(userId);

    // Skip further checks if the user is an admin
    if (isAdmin) {
      console.log(`User ${userId} is an admin, allowing cart access`);
      return;
    }

    // Regular authorization check
    if (
      (userId && cartItem.userId !== userId) ||
      (!userId && guestId && cartItem.guestId !== guestId)
    ) {
      console.log(
        `Access denied to cart ${cartItem.id}: cart belongs to userId=${cartItem.userId}, guestId=${cartItem.guestId} requested by userId=${userId}, guestId=${guestId}`,
      );
      throw new ForbiddenException('Unauthorized access to cart item.');
    }
  }

  async getCartItemCount(
    userId: number | null,
    guestId: string | null,
  ): Promise<number> {
    try {
      const aggregateResult = await this.prisma.cart.aggregate({
        _sum: {
          quantity: true,
        },
        where: {
          OR: [{ userId: userId }, { guestId: guestId || undefined }],
        },
      });
      // Jika _sum null (keranjang kosong), kembalikan 0
      return aggregateResult._sum.quantity ?? 0;
    } catch (error) {
      console.error('Error calculating cart item count:', error);
      // Kembalikan 0 jika ada error, atau throw exception sesuai kebutuhan
      return 0;
    }
  }

  async getCartTotal(
    userId: number | null,
    guestId: string | null,
  ): Promise<number> {
    try {
      const cartItems = await this.findManyCarts({
        where: {
          OR: [{ userId: userId }, { guestId: guestId || undefined }],
        },
        include: { size: true },
      });

      if (!cartItems || cartItems.length === 0) {
        return 0; // Return 0 if the cart is empty
      }

      const total = cartItems.reduce((accumulator, item) => {
        const priceString = item.size.price || '0'; // Default to '0' if price is missing

        // Remove Rp and replace dots with nothing to handle thousand separators
        const numericPrice = Number(priceString.replace(/Rp|\./g, ''));

        // Multiply price by quantity and add to the accumulator
        return accumulator + numericPrice * item.quantity;
      }, 0);

      return total; // Return the calculated total as a number
    } catch (error) {
      console.error('Error calculating cart total:', error);
      throw new HttpException(
        'Failed to calculate cart total',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove all cart items that contain a specific catalog (product)
   * This is useful for admins who need to delete a product
   */
  async removeAllCartItemsByCatalogId(
    catalogId: number,
  ): Promise<{ message: string; count: number }> {
    try {
      console.log(
        `Attempting to remove all cart items for catalog ID: ${catalogId}`,
      );

      // First, find all cart items with this catalog ID
      const cartItems = await this.prisma.cart.findMany({
        where: { catalogId },
        include: { catalog: true, size: true },
      });

      if (cartItems.length === 0) {
        console.log(`No cart items found for catalog ID: ${catalogId}`);
        return { message: 'No cart items found with this product', count: 0 };
      }

      console.log(
        `Found ${cartItems.length} cart items for catalog ID: ${catalogId}`,
      );

      // Delete all cart items with this catalog ID
      const result = await this.prisma.cart.deleteMany({
        where: { catalogId },
      });

      console.log(
        `Successfully removed ${result.count} cart items for catalog ID: ${catalogId}`,
      );

      return {
        message: `Successfully removed ${result.count} cart items containing this product`,
        count: result.count,
      };
    } catch (error) {
      console.error(
        `Error removing cart items for catalog ID ${catalogId}:`,
        error,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new HttpException(
          `Database error: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Failed to remove cart items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
