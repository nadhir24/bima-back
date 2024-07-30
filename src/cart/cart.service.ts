import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Cart, Prisma } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async addToCart(
    userId: number,
    catalogId: number,
    quantity: number,
  ): Promise<Cart> {
    try {
      const existingCartItem = await this.prisma.cart.findFirst({
        where: {
          userId,
          catalogId,
        },
      });

      if (existingCartItem) {
        // Update existing cart item if it already exists
        const updatedCartItem = await this.prisma.cart.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + quantity,
          },
        });

        return updatedCartItem;
      } else {
        // Create new cart item if it does not exist
        const newCartItem = await this.prisma.cart.create({
          data: {
            userId,
            catalogId,
            quantity,
          },
        });

        return newCartItem;
      }
    } catch (error) {
      throw new HttpException(
        'Failed to add item to cart',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async create(
    userId: number,
    catalogId: number,
    quantity: number,
  ): Promise<Cart> {
    try {
      return await this.prisma.cart.create({
        data: {
          userId,
          catalogId,
          quantity,
        },
      });
    } catch (error) {
      throw new HttpException(
        'Failed to create cart item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Cart[]> {
    try {
      return await this.prisma.cart.findMany();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch cart items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number): Promise<Cart | null> {
    try {
      return await this.prisma.cart.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);
    }
  }

  async update(id: number, data: Prisma.CartUpdateInput): Promise<Cart> {
    try {
      return await this.prisma.cart.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new HttpException(
        'Failed to update cart item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.cart.delete({
        where: { id },
      });
    } catch (error) {
      throw new HttpException(
        'Failed to delete cart item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
