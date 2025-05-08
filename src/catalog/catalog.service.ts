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
    console.log('=== Creating slugs ===');
    console.log('Input - name:', name);
    console.log('Input - category:', category);
    
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

    console.log('Output - productSlug:', productSlug);
    console.log('Output - categorySlug:', categorySlug);
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
    console.log('=== CatalogService.createCatalog ===');
    console.log('DTO:', JSON.stringify(createCatalogDto, null, 2));

    // Validate required fields
    console.log('Validating required fields');
    const { name, category, sizes } = createCatalogDto;

    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      console.error('Validation error: No sizes provided');
      throw new HttpException(
        'At least one size is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate slugs
    console.log('Generating slugs for name:', name, 'category:', category);
    const { productSlug, categorySlug } = this.createSlug(name, category);
    console.log('Generated slugs:', { productSlug, categorySlug });

    // Check for duplicate slugs
    console.log('Checking for duplicate slugs');
    try {
      const existingCatalog = await this.prisma.catalog.findFirst({
        where: { productSlug, categorySlug },
      });

      if (existingCatalog) {
        console.error('Duplicate slug found:', { productSlug, categorySlug });
        throw new HttpException(
          'A catalog with this slug already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error checking for duplicate slugs:', error);
      throw new HttpException(
        'Failed to check for existing catalogs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Format sizes
    console.log('Formatting sizes');
    let formattedSizes;
    try {
      formattedSizes = sizes.map((size) => {
        const formatted = {
          size: size.size,
          price: this.formatPrice(size.price),
          qty: size.qty || 0,
        };
        console.log('Original size:', size, '-> Formatted:', formatted);
        return formatted;
      });
    } catch (error) {
      console.error('Error formatting sizes:', error);
      throw new HttpException(
        'Failed to format sizes. Please check size data format.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create catalog
    console.log('Creating catalog with data:', {
      name,
      category,
      isEnabled: createCatalogDto.isEnabled,
      image: createCatalogDto.image ? '[Image data present]' : '[No image]',
      slug: productSlug,
      productSlug,
      categorySlug,
      sizes: formattedSizes,
      description: createCatalogDto.description,
    });
    
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
      
      console.log('Catalog created successfully with ID:', result.id);
      return result;
    } catch (error) {
      console.error('Error creating catalog:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error code:', error.code);
        console.error('Prisma error meta:', error.meta);
        
        // Handle specific Prisma errors
        if (error.code === 'P2002') {
          throw new HttpException(
            `Duplicate entry for ${error.meta?.target}`,
            HttpStatus.BAD_REQUEST
          );
        }
      }
      
      // Log request details for troubleshooting
      console.error('Failed request details:', {
        name,
        category,
        slugs: { productSlug, categorySlug },
        sizesCount: formattedSizes.length,
        requestBody: JSON.stringify(createCatalogDto, null, 2)
      });
      
      throw new HttpException(
        'Failed to create catalog. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      price?: string | number;
      qty?: string | number;
    }>,
  ) {
    try {
      console.log('Updating sizes for catalog ID:', catalogId);
      console.log('Sizes data:', JSON.stringify(sizes));
      
      await Promise.all(
        sizes.map(async (size) => {
          if (!size.id) {
            console.log('Skipping size update: No ID provided');
            return;
          }
          
          const sizeId = typeof size.id === 'string' ? parseInt(size.id, 10) : size.id;
          
          if (isNaN(sizeId)) {
            throw new HttpException(
              `Invalid size ID: ${size.id}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          console.log(`Processing size ID: ${sizeId}`);
          
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
            const qtyNumeric = typeof size.qty === 'string' 
              ? parseInt(size.qty, 10) 
              : size.qty;
              
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
            console.log(`Setting qty for size ${sizeId} to: ${qtyNumeric}`);
          }
          
          if (size.price !== undefined) {
            updateData.price = this.formatPrice(size.price);
            console.log(`Setting price for size ${sizeId} to: ${updateData.price}`);
          }
          
          if (size.size !== undefined) {
            updateData.size = size.size;
            console.log(`Setting size name for size ${sizeId} to: ${size.size}`);
          }

          if (Object.keys(updateData).length > 0) {
            console.log(`Updating size ${sizeId} with data:`, updateData);
            await this.prisma.size.update({
              where: { id: sizeId },
              data: updateData,
            });
            console.log(`Successfully updated size ${sizeId}`);
          } else {
            console.log(`No changes to apply for size ${sizeId}`);
          }
        }),
      );
      
      console.log('Successfully updated all sizes');
    } catch (error) {
      console.error('Failed to update sizes:', error);
      throw new HttpException(
        error.message || 'Failed to update sizes', 
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Remove a catalog and its associated sizes.
   */
  async remove(catalogId: number): Promise<Catalog> {
    try {
      console.log(`Attempting to delete catalog with ID: ${catalogId}`);
      
      return await this.prisma.$transaction(async (tx) => {
        // 1. Delete associated sizes first
        await tx.size.deleteMany({ // Ganti 'size' dengan nama model Prisma untuk ukuran/varian jika berbeda
          where: { catalogId: catalogId },
        });
        console.log(`Deleted associated sizes for catalog ID: ${catalogId}`);

        // 2. Then, delete the catalog itself
        const deletedCatalog = await tx.catalog.delete({
          where: { id: catalogId },
        });
        console.log(`Successfully deleted catalog with ID: ${catalogId}`);
        
        return deletedCatalog;
      });

    } catch (error) {
      console.error(`Error deleting catalog with ID ${catalogId}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new HttpException(
          'Cannot delete this product because it is referenced by other data (e.g., sizes). Please ensure related data is removed or use a force delete option if available and appropriate.',
          HttpStatus.BAD_REQUEST, // P2003 is a client error due to constraints
        );
      }
      // ... (penanganan error lainnya yang sudah ada) ...
      throw new HttpException(
        error.message || 'Failed to delete product',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    console.log('=== Formatting price ===');
    console.log('Input price:', price, 'Type:', typeof price);
    
    if (typeof price === 'number') {
      const result = String(price);
      console.log('Formatting number price, result:', result);
      return result;
    }

    // Remove any non-numeric characters except for decimal point
    const cleanedPrice = price.replace(/[^\d.]/g, '');
    console.log('Cleaned price:', cleanedPrice);
    
    // Ensure there's only one decimal point
    const parts = cleanedPrice.split('.');
    let result = parts[0];
    if (parts.length > 1) {
      result += '.' + parts.slice(1).join('');
    }
    
    console.log('Formatted price result:', result);
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
        sizes: true, // Include sizes relation
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
    limit: number = 10
  ) {
    try {
      console.log('Finding products by date range:', { startDate, endDate, page, limit });

      const skip = (page - 1) * limit;

      const [products, totalCount] = await Promise.all([
        this.prisma.catalog.findMany({
          where: {
            id: {
              gte: 1 // This will return all products
            }
          },
          include: {
            sizes: true,
          },
          skip,
          take: limit,
          orderBy: {
            id: 'desc', // Order by id instead of createdAt
          },
        }),
        this.prisma.catalog.count({
          where: {
            id: {
              gte: 1 // This will count all products
            }
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
      console.error('Error in findByDateRange:', error);
      throw new HttpException(
        'Failed to find products by date range',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Search catalogs by name or category slug
   */
  async searchCatalogs(query: string): Promise<Catalog[]> {
    if (!query) {
      return this.findAll();
    }

    console.log(`Searching catalogs with query: ${query}`);
    
    // Make query lowercase for case-insensitive search
    const searchQuery = query.toLowerCase();
    
    // Get all catalogs first
    const allCatalogs = await this.prisma.catalog.findMany({
      include: { sizes: true },
    });
    
    // Filter in memory for more flexible search
    const filteredCatalogs = allCatalogs.filter(catalog => {
      const nameMatch = catalog.name.toLowerCase().includes(searchQuery);
      const categorySlugMatch = catalog.categorySlug.toLowerCase().includes(searchQuery);
      const productSlugMatch = catalog.productSlug.toLowerCase().includes(searchQuery);
      
      return nameMatch || categorySlugMatch || productSlugMatch;
    });
    
    console.log(`Found ${filteredCatalogs.length} catalogs matching query: ${query}`);
    
    return filteredCatalogs;
  }

  /**
   * Find catalogs by category slug
   */
  async findByCategory(categorySlug: string): Promise<Catalog[]> {
    console.log(`Finding catalogs by category slug: ${categorySlug}`);
    
    const catalogs = await this.prisma.catalog.findMany({
      where: { categorySlug },
      include: { sizes: true },
    });
    
    console.log(`Found ${catalogs.length} catalogs for category: ${categorySlug}`);
    
    return catalogs;
  }
}