import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, Catalog } from '@prisma/client';
import { error } from 'console';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
@Injectable()
export class CatalogService {
  update(arg0: number, data: Prisma.CatalogUpdateInput): { id: number; name: string; category: string; qty: number; isEnabled: boolean; image: string; } | PromiseLike<{ id: number; name: string; category: string; qty: number; isEnabled: boolean; image: string; }> {
    throw new Error('Method not implemented.');
  }
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
    const { name, category, qty, isEnabled, image } = createCatalogDto;

    // Create the catalog entry
    return this.prisma.catalog.create({
      data: {
        name,
        category,
        qty,
        isEnabled: isEnabled ?? false, // Default to false if undefined
        image,
      },
    });
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
