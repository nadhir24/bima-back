import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, Catalog } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Catalog[]> {
    try {
      const catalogs = await this.prisma.catalog.findMany();
      return catalogs.map((catalog) => ({
        ...catalog,
        // Optional: include logic for formatting image URLs
      }));
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
    console.log('Fetching catalog with ID:', id); // Debugging log
    try {
      const catalog = await this.prisma.catalog.findUnique({
        where: { id },
      });
      console.log('Catalog result:', catalog); // Debugging log
      if (!catalog) {
        throw new HttpException(
          'Catalog entry not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return catalog;
    } catch (error) {
      console.error('Error fetching catalog:', error);
      throw new HttpException(
        'Failed to retrieve catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createCatalog(createCatalogDto: CreateCatalogDto): Promise<Catalog> {
    const { name, category, qty, price, isEnabled, image, size } =
      createCatalogDto;
    const formattedPrice = `Rp${parseFloat(price).toLocaleString('id-ID', { minimumFractionDigits: 3 }).replace('.', ',')}`;

    try {
      const newCatalog = await this.prisma.catalog.create({
        data: {
          name,
          category,
          qty,
          price: formattedPrice,
          size,
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
  async findByNameAndCategory(
    name: string,
    category: string,
  ): Promise<Catalog> {
    try {
      const catalog = await this.prisma.catalog.findFirst({
        where: {
          name,
          category,
        },
      });

      if (!catalog) {
        throw new HttpException(
          'Catalog entry not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return catalog;
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
