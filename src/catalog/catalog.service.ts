import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, Catalog } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Catalog[]> {
    try {
      return await this.prisma.catalog.findMany();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve catalog entries',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateQuantity(catalogId: number, quantity: number): Promise<void> {
    try {
      const existingCatalog = await this.prisma.catalog.findUnique({
        where: { id: catalogId },
      });

      if (!existingCatalog) {
        throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
      }

      const updatedQty = existingCatalog.qty - quantity;

      if (updatedQty < 0) {
        throw new HttpException('Not enough stock', HttpStatus.BAD_REQUEST);
      }

      await this.prisma.catalog.update({
        where: { id: catalogId },
        data: { qty: updatedQty },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update catalog quantity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number): Promise<Catalog> {
    try {
      const catalog = await this.prisma.catalog.findUnique({
        where: { id },
      });
      if (!catalog) {
        throw new HttpException(
          'Catalog entry not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return catalog;
    } catch (error) {
      if (error.status && error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createCatalog(createCatalogDto: CreateCatalogDto): Promise<Catalog> {
    const { name, category, qty, price, isEnabled, image } = createCatalogDto;
    const formattedPrice = `Rp${parseFloat(createCatalogDto.price).toLocaleString('id-ID', { minimumFractionDigits: 3 }).replace('.', ',')}`;

    try {
      // Ensure price is stored as a string in the database
      const newCatalog = await this.prisma.catalog.create({
        data: {
          name,
          category,
          qty,
          price: formattedPrice, // Ensure price is stored as a string in the database
          isEnabled,
          image,
        },
      });

      return newCatalog;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  async update(id: number, data: Prisma.CatalogUpdateInput): Promise<Catalog> {
    try {
      return await this.prisma.catalog.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new HttpException(
        'Failed to update catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: number): Promise<Catalog> {
    try {
      return await this.prisma.catalog.delete({
        where: { id },
      });
    } catch (error) {
      throw new HttpException(
        'Failed to remove catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
