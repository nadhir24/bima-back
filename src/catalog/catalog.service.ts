import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Catalog, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import slugify from 'slugify';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}
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

  async findBySlug(
    categorySlug: string,
    productSlug: string,
  ): Promise<Catalog> {
    console.log(
      `Querying database with categorySlug: ${categorySlug}, productSlug: ${productSlug}`,
    );

    return await this.prisma.catalog.findFirst({
      where: {
        productSlug: productSlug,
        categorySlug: categorySlug,
      },
      include: { sizes: true },
    });
  }

  async findAll(): Promise<Catalog[]> {
    const catalogs = await this.prisma.catalog.findMany({
      include: { sizes: true },
    });

    return catalogs.map((catalog) => ({
      ...catalog,
      sizes: catalog.sizes.map((size) => ({
        size: size.size,
        price: size.price,
      })),
    }));
  }

  async findOne(id: number): Promise<Catalog> {
    const catalog = await this.prisma.catalog.findUnique({
      where: { id },
      include: { sizes: true },
    });

    if (!catalog) {
      throw new HttpException('Catalog entry not found', HttpStatus.NOT_FOUND);
    }

    return catalog;
  }
  async createCatalog(createCatalogDto: CreateCatalogDto): Promise<Catalog> {
    const { name, category, sizes } = createCatalogDto;

    // Validate sizes array
    if (!sizes || !Array.isArray(sizes)) {
      throw new HttpException(
        'Sizes must be provided and should be an array',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate slugs using the method
    const { productSlug, categorySlug } = this.createSlug(name, category);

    // Check if catalog with the same product slug exists
    const existingCatalog = await this.prisma.catalog.findUnique({
      where: { slug: productSlug },
    });

    if (existingCatalog) {
      throw new HttpException(
        'A catalog with this slug already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Format sizes for the database
    const formattedSizes = sizes.map((size) => ({
      size: size.size,
      price: this.formatPrice(size.price), // Ensure this returns a string
    }));

    // Create the new catalog entry
    const newCatalog = await this.prisma.catalog.create({
      data: {
        name: name, // Required fields
        category: category, // Required fields
        qty: createCatalogDto.qty, // Required fields
        isEnabled: createCatalogDto.isEnabled, // Required fields
        image: createCatalogDto.image, // Optional fields
        slug: productSlug, // Required field
        productSlug: productSlug, // Ensure this is provided
        categorySlug: categorySlug, // Optional field
        sizes: { create: formattedSizes }, // Create sizes relation
        description: createCatalogDto.description,
      },
      include: { sizes: true }, // Include sizes in the response
    });

    return newCatalog; // Return the newly created catalog
  }

  async updateCatalog(
    id: number,
    updateCatalogDto: UpdateCatalogDto,
  ): Promise<Catalog> {
    // Verify that the catalog exists
    const existingCatalog = await this.prisma.catalog.findUnique({
      where: { id },
      include: { sizes: true },
    });
  
    if (!existingCatalog) {
      throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
    }
  
    // Prepare the update data
    const updateData: Prisma.CatalogUpdateInput = {
      name: updateCatalogDto.name ?? existingCatalog.name,
      category: updateCatalogDto.category ?? existingCatalog.category,
      isEnabled: updateCatalogDto.isEnabled ?? existingCatalog.isEnabled,
      image: updateCatalogDto.image ?? existingCatalog.image,
      description: updateCatalogDto.description ?? existingCatalog.description,
      // Only include qty if it's explicitly provided
      ...(updateCatalogDto.qty !== undefined && { qty: updateCatalogDto.qty }),
    };
  
    // Handle sizes update
    if (
      updateCatalogDto.sizes &&
      Array.isArray(updateCatalogDto.sizes) &&
      updateCatalogDto.sizes.length > 0
    ) {
      updateData.sizes = {
        deleteMany: { catalogId: id },
        create: updateCatalogDto.sizes.map((size) => ({
          size: size.size,
          price: this.formatPrice(size.price),
        })),
      };
    }
  
    // Perform the update
    const updatedCatalog = await this.prisma.catalog.update({
      where: { id },
      data: updateData,
      include: { sizes: true },
    });
  
    return updatedCatalog;
  }
  
  

  async remove(id: number): Promise<Catalog> {
    const existingCatalog = await this.prisma.catalog.findUnique({
      where: { id },
    });
    if (!existingCatalog) {
      throw new HttpException('Catalog not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.size.deleteMany({ where: { catalogId: id } });
    return this.prisma.catalog.delete({
      where: { id },
    });
  }

  private formatPrice(price: string | number): string {
    const numericPrice =
      typeof price === 'string'
        ? parseFloat(price.replace(/[^\d]/g, ''))
        : price;
    return `Rp${numericPrice.toLocaleString('id-ID', { minimumFractionDigits: 3 }).replace('.', ',')}`;
  }
}
