import { Injectable, HttpException, HttpStatus, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Cart, Prisma } from '@prisma/client';
import { CreateCartDto } from './dto/create-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async addToCart(userId: number, catalogId: number, sizeId: number, quantity: number) {
    // Check if the product and size exist
    const catalog = await this.prisma.catalog.findUnique({
      where: { id: catalogId },
      include: { sizes: true },
    });
    
    if (!catalog) {
      throw new NotFoundException('Product not found');
    }
    
    const size = await this.prisma.size.findUnique({
      where: { id: sizeId },
    });

    if (!size) {
      throw new NotFoundException('Size not found');
    }

    // Check if the cart already contains this product and size for the user
    const existingCartItem = await this.prisma.cart.findFirst({
      where: {
        userId,
        catalogId,
        sizeId,
      },
    });

    if (existingCartItem) {
      // If the item exists in the cart, just update the quantity
      return await this.prisma.cart.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + quantity, // Increment the quantity
        },
      });
    }

    // If the item is not in the cart, create a new cart item
    return await this.prisma.cart.create({
      data: {
        userId,
        catalogId,
        sizeId,
        quantity,
      },
    });
  }
  async getCart(userId: number) {
    return await this.prisma.cart.findMany({
      where: { userId },
      include: {
        catalog: true, // Include product details
        size: true,    // Include size details
      },
    });
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

  async updateCartItem(userId: number, cartId: number, quantity: number) {
    const cartItem = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });
  
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }
  
    // Make sure the cart item belongs to the user
    if (cartItem.userId !== userId) {
      throw new ForbiddenException('You do not have access to this cart item');
    }
  
    // Update the quantity
    return await this.prisma.cart.update({
      where: { id: cartId },
      data: { quantity },
    });
  }
  

  async removeCartItem(userId: number, cartId: number) {
    const cartItem = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });
  
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }
  
    // Make sure the cart item belongs to the user
    if (cartItem.userId !== userId) {
      throw new ForbiddenException('You do not have access to this cart item');
    }
  
    // Delete the cart item
    return await this.prisma.cart.delete({
      where: { id: cartId },
    });
  }
  
}
