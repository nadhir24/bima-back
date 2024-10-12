import { Injectable, HttpException, HttpStatus, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Cart, Prisma } from '@prisma/client';
import { CreateCartDto } from './dto/create-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async addToCart(userId: number, catalogId: number, sizeId: number, quantity: number) {
    try {
      // Check if the product exists
      const catalogIdInt = Number(catalogId);
      if (isNaN(catalogIdInt)) {
        throw new BadRequestException('Invalid catalog ID');
      }
      const catalog = await this.prisma.catalog.findUnique({
        where: { id: catalogId },
        include: { sizes: true },
      });
  
      if (!catalog) {
        throw new NotFoundException('Product not found');
      }
  
      // Check if the size exists
      const size = await this.prisma.size.findUnique({
        where: { id: sizeId },
      });
  
      if (!size) {
        throw new NotFoundException('Size not found');
      }
  
      // Check if the size is available for this catalog
      const sizeAvailable = catalog.sizes.some(s => s.id === sizeId);
      if (!sizeAvailable) {
        throw new BadRequestException('This size is not available for the selected product');
      }
  
      // Check stock availability
      if (catalog.qty < quantity) {
        throw new BadRequestException('Insufficient stock');
      }
  
      // Check if the item is already in the cart
      const existingCartItem = await this.prisma.cart.findFirst({
        where: { userId, catalogId, sizeId },
      });
  
      if (existingCartItem) {
        // Update existing cart item
        const newQuantity = existingCartItem.quantity + quantity;
        if (catalog.qty < newQuantity) {
          throw new BadRequestException('Insufficient stock for requested quantity');
        }
        return await this.prisma.cart.update({
          where: { id: existingCartItem.id },
          data: { quantity: newQuantity },
        });
      } else {
        // Create new cart item
        return await this.prisma.cart.create({
          data: { userId, catalogId, sizeId, quantity },
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // Log the error and throw a generic error message
      console.error('Error in addToCart:', error);
      throw new InternalServerErrorException('An error occurred while processing your request');
    }
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
