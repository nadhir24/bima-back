import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
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
    userId: string | null,
    guestId: string | null,
    catalogId: string,
    sizeId: string,
    quantity: number,
  ): Promise<Cart> {
    try {
      // Validasi input
      if (!catalogId || !sizeId || quantity <= 0) {
        throw new BadRequestException('Invalid input data');
      }

      // Pastikan minimal userId atau guestId ada
      if (!userId && !guestId) {
        throw new BadRequestException('Either userId or guestId is required');
      }

      // Cek apakah item sudah ada di cart
      const existingCart = await this.prisma.cart.findFirst({
        where: {
          OR: [
            { userId: userId || undefined },
            { guestId: guestId || undefined },
          ],
          catalogId,
          sizeId,
        },
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
      throw error;
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