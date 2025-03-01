import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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
    return this.prisma.$transaction(async (prisma) => {
      const catalog = await prisma.catalog.findUniqueOrThrow({
        where: { id: catalogId },
      });
      if (catalog.qty < quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${catalog.name}. Available: ${catalog.qty}`,
        );
      }
      await prisma.size.findUniqueOrThrow({ where: { id: sizeId } });

      const cartItem = await prisma.cart.create({
        data: { quantity, userId, guestId, catalogId, sizeId },
      });

      await prisma.catalog.update({
        where: { id: catalogId },
        data: { qty: { decrement: quantity } },
      });
      return cartItem;
    });
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
    return this.prisma.$transaction(async (prisma) => {
      if (quantity <= 0) return this.removeCartItem(userId, guestId, cartId);

      const cartItem = await prisma.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: { catalog: true },
      });
      this.authorizeCartAccess(cartItem, userId, guestId);

      const catalog = await prisma.catalog.findUniqueOrThrow({
        where: { id: cartItem.catalogId },
      });
      if (catalog.qty < quantity - cartItem.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${catalog.name}. Available: ${catalog.qty}`,
        );
      }

      await prisma.cart.update({ where: { id: cartId }, data: { quantity } });
      await prisma.catalog.update({
        where: { id: catalog.id },
        data: { qty: { decrement: quantity - cartItem.quantity } },
      });
      return cartItem;
    });
  }

  async removeCartItem(
    userId: number | null,
    guestId: string | null,
    cartId: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const cartItem = await prisma.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: { catalog: true },
      });
      this.authorizeCartAccess(cartItem, userId, guestId);

      await prisma.catalog.update({
        where: { id: cartItem.catalog.id },
        data: { qty: { increment: cartItem.quantity } },
      });
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
    // ✅ TAMBAHKAN FUNCTION getCartTotal DI CartService (COPY DARI CONTROLLER, MODIFIKASI RETURN VALUE)
    async getCartTotal(userId: number | null, guestId: string | null): Promise<number> { // ✅ RETURN VALUE: Promise<number>
      const cartItems = await this.findManyCarts({
        where: { OR: [{ userId: userId || undefined }, { guestId: guestId || undefined }] },
        include: { size: true },
      });
  
      // ✅ PERHITUNGAN TOTAL, SAMA DENGAN DI CONTROLLER
      const total = cartItems.reduce((acc, item) => acc + parseFloat(item.size.price.replace(/Rp|,/g, '')) * item.quantity, 0);
      return total; // ✅ KEMBALIKAN NILAI NUMBER (FLOAT), TANPA FORMAT RUPIAH
    }
}
