import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async findManyCarts(params: Prisma.CartFindManyArgs): Promise<any> {
    return this.prisma.cart.findMany(params);
  }

  async addToCart(
    userId: number | null,
    guestId: string | null,
    catalogId: number,
    sizeId: number,
    quantity: number,
  ) {
    const prisma = this.prisma;

    if (!catalogId || !sizeId) {
      throw new HttpException('Invalid input data', HttpStatus.BAD_REQUEST);
    }

    if (quantity > 0) {
      const size = await prisma.size.findUnique({
        where: { id: sizeId },
        include: { catalog: true },
      });

      if (!size) {
        throw new HttpException('Size not found', HttpStatus.NOT_FOUND);
      }

      const availableQty = size.qty || 0;

      if (availableQty < quantity) {
        throw new HttpException(
          `Insufficient stock for ${size.catalog.name} (${size.size}). Available: ${availableQty}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingCart = await prisma.cart.findFirst({
        where: {
          catalogId,
          sizeId,
          ...(userId ? { userId } : { guestId }),
        },
      });

      if (existingCart) {
        return this.updateCartItem(
          userId,
          guestId,
          existingCart.id,
          existingCart.quantity + quantity,
        );
      }

      const cartItem = await prisma.cart.create({
        data: { quantity, userId, guestId, catalogId, sizeId },
        include: { catalog: true, size: true, user: true },
      });

      return cartItem;
    }
  }

  async findUniqueCart(params: Prisma.CartFindUniqueArgs): Promise<any> {
    return this.prisma.cart.findUnique(params);
  }

  async findFirstCart(params: Prisma.CartFindFirstArgs): Promise<any> {
    return this.prisma.cart.findFirst(params);
  }

  async updateCartItem(
    userId: number | null,
    guestId: string | null,
    cartId: number,
    quantity: number,
  ) {
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
      if (
        cartItem.size?.qty !== undefined && 
        quantity > cartItem.size.qty
      ) {
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
      console.error("Error in updateCartItem:", error);
      
      // Perbaikan error handling
      if (error instanceof HttpException) {
        throw error;
      } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new HttpException(
          `Database error: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      } else {
        throw new HttpException(
          "Failed to update cart item",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }
  
  
  

  async removeCartItem(
    userId: number | null,
    guestId: string | null,
    cartId: number,
  ) {
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

  async syncCart(userId: number, guestId: string) {
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

  async removeManyCarts(params: Prisma.CartDeleteManyArgs) {
    return this.prisma.cart.deleteMany(params);
  }

  private authorizeCartAccess(
    cartItem: any,
    userId: number | null,
    guestId: string | null,
  ) {
    if (
      (userId && cartItem.userId !== userId) ||
      (!userId && guestId && cartItem.guestId !== guestId)
    ) {
      throw new ForbiddenException('Unauthorized access to cart item.');
    }
  }

  async getCartTotal(userId: number | null, guestId: string | null): Promise<number> {
    try {
      const cartItems = await this.findManyCarts({
        where: {
          OR: [
            { userId: userId || undefined },
            { guestId: guestId || undefined },
          ],
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
      throw new HttpException('Failed to calculate cart total', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}