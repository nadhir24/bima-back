import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, Catalog } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { FindCatalogDto } from './dto/find-catalog.dto';
import slugify from 'slugify';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  createSlug(name: string): string {
    return slugify(name, {
      lower: true,
      strict: true,
      locale: 'id',
    });
  }

  async findBySlug(slug: string): Promise<Catalog> {
    try {
      const catalog = await this.prisma.catalog.findUnique({
        where: { slug },
        include: { sizes: true }, // Include sizes in the returned catalog
      });

      if (!catalog) {
        throw new HttpException(
          'Catalog entry not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Format the sizes to include formatted prices
      const formattedCatalog = {
        ...catalog,
        sizes: catalog.sizes.map((size) => ({
          ...size,
          price: `Rp${Number(size.price).toLocaleString('id-ID', { minimumFractionDigits: 0 }).replace('.', ',')}`, // Format price
        })),
      };

      return formattedCatalog;
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve catalog entry',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Catalog[]> {
    try {
      const catalogs = await this.prisma.catalog.findMany({
        include: { sizes: true },
      });

      // Format sizes prices for response
      return catalogs.map((catalog) => ({
        ...catalog,
        sizes: catalog.sizes.map((size) => ({
          size: size.size,
          price: size.price, // Keep it as a string from the database
        })),
      }));
    } catch (error) {
      console.error('Error retrieving catalog entries:', error);
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
        include: { sizes: true }, // Include sizes if needed
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
    const { name, category, qty, isEnabled, image, sizes } = createCatalogDto;

    // Check if sizes is defined and is an array
    if (!sizes || !Array.isArray(sizes)) {
      throw new HttpException(
        'Sizes must be provided and should be an array',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create slug
    const slug = this.createSlug(name);

    // Check for existing catalog with the same slug
    const existingCatalog = await this.prisma.catalog.findUnique({
      where: { slug },
    });

    if (existingCatalog) {
      throw new HttpException(
        'A catalog with this slug already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Format sizes for database insertion
    // Format sizes for database insertion
    const formatPrice = (price: string | number): string => {
      const numericPrice =
        typeof price === 'string'
          ? parseFloat(price.replace(/[^\d]/g, ''))
          : price;
      return `Rp${numericPrice.toLocaleString('id-ID', { minimumFractionDigits: 3 }).replace('.', ',')}`;
    };

    // Format sizes for database insertion
    const formattedSizes = sizes.map((size) => ({
      size: size.size,
      price: formatPrice(size.price),
    }));

    // Create the catalog entry and include the sizes
    const newCatalog = await this.prisma.catalog.create({
      data: {
        name,
        slug,
        category,
        qty,
        isEnabled,
        image,
        sizes: {
          create: formattedSizes,
        },
      },
      include: { sizes: true },
    });

    return newCatalog;
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
      // Pertama, hapus semua entri di tabel Size yang terkait dengan catalog
      await this.prisma.size.deleteMany({
        where: { catalogId: id },
      });

      // Kemudian, hapus entri di tabel catalog
      return await this.prisma.catalog.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        // Tangani kesalahan khusus dari Prisma jika ada
        if (error.code === 'P2025') {
          throw new HttpException(
            'Catalog entry not found',
            HttpStatus.NOT_FOUND,
          );
        }
      }
      console.error(error);
      throw new HttpException(
        error.message || 'Failed to remove catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findByNameAndCategory(
    findCatalogDto: FindCatalogDto,
  ): Promise<Catalog> {
    const { name, category } = findCatalogDto; // Destructure DTO
    try {
      const catalog = await this.prisma.catalog.findFirst({
        where: {
          name,
          category,
        },
        include: { sizes: true }, // Include sizes if needed
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
