import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Cart, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // Helper untuk validasi user atau guest
  private validateUserOrGuest(userId: number | null, guestId: string | null) {
    console.log('validateUserOrGuest called with:', userId, guestId);
    if (!userId && !guestId) {
      throw new BadRequestException('Either userId or guestId must be provided.');
    }
    return userId ?? guestId;
  }
  

  

  async getCart(userId: number | null, guestId: string | null) {
    // Jika guestId tidak ada, periksa session
    if (!guestId) {
      guestId = userId ? userId.toString() : null;
    }

    if (!guestId) {
      throw new Error('Either userId or guestId must be provided.');
    }

    return await this.prisma.cart.findMany({
      where: {
        ...(userId ? { userId } : { guestId }),
      },
      include: {
        catalog: true,
        size: true,
      },
    });
  }

  // Method untuk menambah cart
  async addToCart(userId: number | null, guestId: string | null, catalogId: number, sizeId: number, quantity: number) {
    // Kalau tidak ada guestId, generate baru dan simpan di session
    if (!guestId) {
      guestId = uuidv4();
    }

    const existingCartItem = await this.prisma.cart.findFirst({
      where: {
        ...(userId ? { userId } : { guestId }),
        catalogId,
        sizeId,
      },
    });

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity;
      return await this.prisma.cart.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      return await this.prisma.cart.create({
        data: {
          userId,
          guestId,
          catalogId,
          sizeId,
          quantity,
        },
      });
    }
  }

  // Menemukan item keranjang tertentu
  async findOne(cartId: number): Promise<Cart | null> {
    try {
      return await this.prisma.cart.findUnique({
        where: { id: cartId },
      });
    } catch (error) {
      throw new NotFoundException('Cart item not found');
    }
  }

  // Memperbarui jumlah item di keranjang
  async updateCartItem(
    userId: number | null,
    guestId: string | null,
    cartId: number,
    quantity: number,
  ) {
    const userOrGuest = this.validateUserOrGuest(userId, guestId);

    const cartItem = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');

    if (
      (userId && cartItem.userId !== userId) ||
      (guestId && cartItem.guestId !== guestId)
    ) {
      throw new ForbiddenException('You do not have access to this cart item');
    }

    return await this.prisma.cart.update({
      where: { id: cartId },
      data: { quantity },
    });
  }

  // Sinkronisasi cart antara guest dan user
  async syncCart(
    userId: number,
    guestCart: Array<{ catalogId: number; sizeId: number; quantity: number }>,
  ) {
    try {
      for (const item of guestCart) {
        const catalog = await this.prisma.catalog.findUnique({
          where: { id: item.catalogId },
          include: { sizes: true },
        });

        if (!catalog) {
          throw new NotFoundException(
            `Product with catalogId ${item.catalogId} not found.`,
          );
        }

        const sizeAvailable = catalog.sizes.some((s) => s.id === item.sizeId);
        if (!sizeAvailable) {
          throw new BadRequestException(
            `Size with sizeId ${item.sizeId} is not available for product ${item.catalogId}.`,
          );
        }

        if (catalog.qty < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.catalogId} with requested quantity ${item.quantity}.`,
          );
        }

        const existingCartItem = await this.prisma.cart.findFirst({
          where: {
            userId,
            catalogId: item.catalogId,
            sizeId: item.sizeId,
          },
        });

        if (existingCartItem) {
          const newQuantity = existingCartItem.quantity + item.quantity;
          if (catalog.qty < newQuantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${item.catalogId} with updated quantity ${newQuantity}.`,
            );
          }

          await this.prisma.cart.update({
            where: { id: existingCartItem.id },
            data: { quantity: newQuantity },
          });
        } else {
          await this.prisma.cart.create({
            data: {
              userId,
              catalogId: item.catalogId,
              sizeId: item.sizeId,
              quantity: item.quantity,
            },
          });
        }
      }

      return { message: 'Cart synchronized successfully.' };
    } catch (error) {
      console.error('Error during cart synchronization:', error);
      throw new InternalServerErrorException('Failed to synchronize cart.');
    }
  }

  // Menghapus item dari keranjang
  async removeCartItem(
    userId: number | null,
    guestId: string | null,
    cartId: number,
  ) {
    const userOrGuest = this.validateUserOrGuest(userId, guestId);

    const cartItem = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');

    if (
      (userId && cartItem.userId !== userId) ||
      (guestId && cartItem.guestId !== guestId)
    ) {
      throw new ForbiddenException('You do not have access to this cart item');
    }

    return await this.prisma.cart.delete({
      where: { id: cartId },
    });
  }
}
