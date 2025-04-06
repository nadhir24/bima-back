import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Catalog, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import slugify from 'slugify';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique slugs for product and category.
   */
  private createSlug(
    name: string,
    category: string,
  ): { productSlug: string; categorySlug: string } {
    const productSlug = slugify(name, {
      lower: true,
      strict: true,
      locale: 'id',
    });
    const categorySlug = slugify(category, {
      lower: true,
      strict: true,
      locale: 'id',
    });

    return { productSlug, categorySlug };
  }

  /**
   * Find a catalog by its slugs.
   */
  async findBySlug(
    categorySlug: string,
    productSlug: string,
  ): Promise<Catalog> {
    console.log(
      `Querying database with categorySlug: ${categorySlug}, productSlug: ${productSlug}`,
    );

    const catalog = await this.prisma.catalog.findFirst({
      where: { productSlug, categorySlug },
      include: { sizes: true },
    });

    if (!catalog) {
      throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
    }

    return catalog;
  }

  /**
   * Get all catalogs.
   */
  async findAll(): Promise<Catalog[]> {
    return this.prisma.catalog.findMany({ include: { sizes: true } });
  }

  /**
   * Get a single catalog by ID.
   */
  async findOne(id: number): Promise<Catalog> {
    const catalog = await this.prisma.catalog.findUnique({
      where: { id },
      include: { sizes: true },
    });

    if (!catalog) {
      throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
    }

    return catalog;
  }

  /**
   * Create a new catalog.
   */
  async createCatalog(createCatalogDto: CreateCatalogDto): Promise<Catalog> {
    const { name, category, sizes } = createCatalogDto;

    // Validate sizes
    if (!sizes || !Array.isArray(sizes)) {
      throw new HttpException(
        'Sizes must be provided and should be an array',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate slugs
    const { productSlug, categorySlug } = this.createSlug(name, category);

    // Check for duplicate slugs
    const existingCatalog = await this.prisma.catalog.findFirst({
      where: { productSlug, categorySlug },
    });

    if (existingCatalog) {
      throw new HttpException(
        'A catalog with this slug already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Format sizes
    const formattedSizes = sizes.map((size) => ({
      size: size.size,
      price: this.formatPrice(size.price),
      qty: size.qty || 0,
    }));

    // Create catalog
    return this.prisma.catalog.create({
      data: {
        name,
        category,
        isEnabled: createCatalogDto.isEnabled,
        image: createCatalogDto.image,
        slug: productSlug,
        productSlug,
        categorySlug,
        sizes: { create: formattedSizes },
        description: createCatalogDto.description,
      },
      include: { sizes: true },
    });
  }

  /**
   * Update an existing catalog.
   */
  async updateCatalog(
    id: number,
    updateCatalogDto: UpdateCatalogDto,
  ): Promise<Catalog> {
    const existingCatalog = await this.prisma.catalog.findUnique({
      where: { id },
      include: { sizes: true },
    });

    if (!existingCatalog) {
      throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
    }

    // Prepare update data
    const updateData: Prisma.CatalogUpdateInput = {};
    if (updateCatalogDto.name) updateData.name = updateCatalogDto.name;
    if (updateCatalogDto.category) updateData.category = updateCatalogDto.category;
    if (updateCatalogDto.isEnabled !== undefined)
      updateData.isEnabled = updateCatalogDto.isEnabled;
    if (updateCatalogDto.image) updateData.image = updateCatalogDto.image;
    if (updateCatalogDto.description)
      updateData.description = updateCatalogDto.description;

    // Update slugs if name or category changes
    if (updateCatalogDto.name || updateCatalogDto.category) {
      const { productSlug, categorySlug } = this.createSlug(
        updateCatalogDto.name ?? existingCatalog.name,
        updateCatalogDto.category ?? existingCatalog.category,
      );

      const slugExists = await this.prisma.catalog.findFirst({
        where: { productSlug, categorySlug, id: { not: id } },
      });

      if (slugExists) {
        throw new HttpException(
          'A catalog with this slug already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      updateData.productSlug = productSlug;
      updateData.categorySlug = categorySlug;
    }

    // Update sizes
    if (updateCatalogDto.sizes?.length > 0) {
      await this.handleSizesUpdate(id, updateCatalogDto.sizes);
    }

    return this.prisma.catalog.update({
      where: { id },
      data: updateData,
      include: { sizes: true },
    });
  }

  /**
   * Handle updates to sizes.
   */
  private async handleSizesUpdate(
    catalogId: number,
    sizes: Array<{
      id?: number;
      size?: string;
      price?: string;
      qty?: number;
    }>,
  ) {
    try {
      await Promise.all(
        sizes.map(async (size) => {
          if (!size.id) return;

          const existingSize = await this.prisma.size.findFirst({
            where: { id: size.id, catalogId },
          });

          if (!existingSize) {
            throw new HttpException(
              `Size with ID ${size.id} not found in catalog ID ${catalogId}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const updateData: Prisma.SizeUpdateInput = {};
          if (size.qty !== undefined) {
            if (size.qty < 0) {
              throw new HttpException(
                'Quantity cannot be negative',
                HttpStatus.BAD_REQUEST,
              );
            }
            updateData.qty = size.qty;
          }
          if (size.price !== undefined) {
            updateData.price = this.formatPrice(size.price);
          }
          if (size.size !== undefined) {
            updateData.size = size.size;
          }

          if (Object.keys(updateData).length > 0) {
            await this.prisma.size.update({
              where: { id: size.id },
              data: updateData,
            });
          }
        }),
      );
    } catch (error) {
      throw new HttpException('Failed to update sizes', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Delete a catalog.
   */
  async remove(id: number): Promise<Catalog> {
    const existingCatalog = await this.prisma.catalog.findUnique({
      where: { id },
    });

    if (!existingCatalog) {
      throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.size.deleteMany({ where: { catalogId: id } });
    return this.prisma.catalog.delete({ where: { id } });
  }

  /**
   * Deduct quantity from a specific size in a catalog.
   */
  async deductQuantity(
    catalogId: number,
    sizeId: number,
    quantity: number,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const existingSize = await tx.size.findFirst({
        where: { id: sizeId, catalogId },
      });

      if (!existingSize) {
        throw new HttpException(
          `Size with ID ${sizeId} not found in catalog ID ${catalogId}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (existingSize.qty < quantity) {
        throw new HttpException(
          `Insufficient quantity available for size ID ${sizeId}. Available: ${existingSize.qty}, Requested: ${quantity}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      await tx.size.update({
        where: { id: sizeId },
        data: { qty: existingSize.qty - quantity },
      });

      console.log(
        `Deducted ${quantity} units from size ID ${sizeId} in catalog ID ${catalogId}. Remaining: ${
          existingSize.qty - quantity
        }`,
      );
    });
  }

  /**
   * Format price consistently.
   */
  private formatPrice(price: string | number): string {
    if (!price) {
      throw new HttpException('Price cannot be null or undefined', HttpStatus.BAD_REQUEST);
    }

    const numericPrice =
      typeof price === 'string'
        ? parseFloat(price.replace(/[^0-9]/g, ''))
        : price;

    if (isNaN(numericPrice) || numericPrice < 0) {
      throw new HttpException('Invalid price format', HttpStatus.BAD_REQUEST);
    }

    return `Rp${numericPrice.toLocaleString('id-ID')}`;
  }
}