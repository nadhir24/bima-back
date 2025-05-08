import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Catalog, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import slugify from 'slugify';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

   createSlug(
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


  async findBySlug(
    categorySlug: string,
    productSlug: string,
  ): Promise<Catalog> {
    const catalog = await this.prisma.catalog.findFirst({
      where: { productSlug, categorySlug },
      include: { sizes: true },
    });

    if (!catalog) {
      throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
    }

    return catalog;
  }


  async findAll(): Promise<Catalog[]> {
    return this.prisma.catalog.findMany({ include: { sizes: true } });
  }


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


  async createCatalog(createCatalogDto: CreateCatalogDto): Promise<Catalog> {
    const { name, category, sizes } = createCatalogDto;

    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      throw new HttpException(
        'At least one size is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { productSlug, categorySlug } = this.createSlug(name, category);

    try {
      const existingCatalog = await this.prisma.catalog.findFirst({
        where: { productSlug, categorySlug },
      });

      if (existingCatalog) {
        throw new HttpException(
          'A catalog with this slug already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to check for existing catalogs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let formattedSizes;
    try {
      formattedSizes = sizes.map((size) => {
        const formatted = {
          size: size.size,
          price: this.formatPrice(size.price),
          qty: size.qty || 0,
        };
        return formatted;
      });
    } catch (error) {
      throw new HttpException(
        'Failed to format sizes. Please check size data format.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.prisma.catalog.create({
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

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpException(
            `Duplicate entry for ${error.meta?.target}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      throw new HttpException(
        'Failed to create catalog',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


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

    const updateData: Prisma.CatalogUpdateInput = {};
    if (updateCatalogDto.name) updateData.name = updateCatalogDto.name;
    if (updateCatalogDto.category)
      updateData.category = updateCatalogDto.category;
    if (updateCatalogDto.isEnabled !== undefined)
      updateData.isEnabled = updateCatalogDto.isEnabled;
    if (updateCatalogDto.image) updateData.image = updateCatalogDto.image;
    if (updateCatalogDto.description)
      updateData.description = updateCatalogDto.description;

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

    if (updateCatalogDto.sizes?.length > 0) {
      await this.handleSizesUpdate(id, updateCatalogDto.sizes);
    }

    return this.prisma.catalog.update({
      where: { id },
      data: updateData,
      include: { sizes: true },
    });
  }


  private async handleSizesUpdate(
    catalogId: number,
    sizes: Array<{
      id?: number;
      size?: string;
      price?: string | number;
      qty?: string | number;
    }>,
  ) {
    try {
      await Promise.all(
        sizes.map(async (size) => {
          if (!size.id) {
            return;
          }

          const sizeId =
            typeof size.id === 'string' ? parseInt(size.id, 10) : size.id;

          if (isNaN(sizeId)) {
            throw new HttpException(
              `Invalid size ID: ${size.id}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const existingSize = await this.prisma.size.findFirst({
            where: { id: sizeId, catalogId },
          });

          if (!existingSize) {
            throw new HttpException(
              `Size with ID ${sizeId} not found in catalog ID ${catalogId}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const updateData: Prisma.SizeUpdateInput = {};

          if (size.qty !== undefined) {
            // Convert qty to number regardless of input type
            const qtyNumeric =
              typeof size.qty === 'string' ? parseInt(size.qty, 10) : size.qty;

            if (isNaN(qtyNumeric)) {
              throw new HttpException(
                `Invalid quantity value: ${size.qty}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            if (qtyNumeric < 0) {
              throw new HttpException(
                'Quantity cannot be negative',
                HttpStatus.BAD_REQUEST,
              );
            }

            updateData.qty = qtyNumeric;
          }

          if (size.price !== undefined) {
            updateData.price = this.formatPrice(size.price);
          }

          if (size.size !== undefined) {
            updateData.size = size.size;
          }

          if (Object.keys(updateData).length > 0) {
            await this.prisma.size.update({
              where: { id: sizeId },
              data: updateData,
            });
          }
        }),
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update sizes',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }


  async remove(catalogId: number): Promise<Catalog> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.size.deleteMany({
          where: { catalogId: catalogId },
        });

        const deletedCatalog = await tx.catalog.delete({
          where: { id: catalogId },
        });

        return deletedCatalog;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new HttpException(
          'Cannot delete this product because it is referenced by other data (e.g., sizes). Please ensure related data is removed or use a force delete option if available and appropriate.',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        error.message || 'Failed to delete product',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


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
    });
  }

  private formatPrice(price: string | number): string {
    if (typeof price === 'number') {
      const result = String(price);
      return result;
    }

    const cleanedPrice = price.replace(/[^\d.]/g, '');

    const parts = cleanedPrice.split('.');
    let result = parts[0];
    if (parts.length > 1) {
      result += '.' + parts.slice(1).join('');
    }

    return result;
  }

  async findAllWithPagination(query: { page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalProducts = await this.prisma.catalog.count();
    const products = await this.prisma.catalog.findMany({
      skip: skip,
      take: limit,
      include: {
        sizes: true,
      },
    });

    return {
      products,
      total: totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    };
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const skip = (page - 1) * limit;

      const [products, totalCount] = await Promise.all([
        this.prisma.catalog.findMany({
          where: {
            id: {
              gte: 1, 
            },
          },
          include: {
            sizes: true,
          },
          skip,
          take: limit,
          orderBy: {
            id: 'desc', 
          },
        }),
        this.prisma.catalog.count({
          where: {
            id: {
              gte: 1, 
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        products,
        totalCount,
        totalPages,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to find products by date range',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchCatalogs(query: string): Promise<Catalog[]> {
    if (!query) {
      return this.findAll();
    }

    const searchQuery = query.toLowerCase();

    const allCatalogs = await this.prisma.catalog.findMany({
      include: { sizes: true },
    });

    const filteredCatalogs = allCatalogs.filter((catalog) => {
      const nameMatch = catalog.name.toLowerCase().includes(searchQuery);
      const categorySlugMatch = catalog.categorySlug
        .toLowerCase()
        .includes(searchQuery);
      const productSlugMatch = catalog.productSlug
        .toLowerCase()
        .includes(searchQuery);

      return nameMatch || categorySlugMatch || productSlugMatch;
    });

    return filteredCatalogs;
  }

 
  async findByCategory(categorySlug: string): Promise<Catalog[]> {
    const catalogs = await this.prisma.catalog.findMany({
      where: { categorySlug },
      include: { sizes: true },
    });

    return catalogs;
  }
}
