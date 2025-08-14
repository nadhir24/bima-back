import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Inject,
  forwardRef,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  ValidationPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CatalogService } from './catalog.service';
import { CartService } from '../cart/cart.service';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

/** Normalize image URL path */
function normalizeImagePath(path: string): string {
  return path.replace(/^\/*/, '/');
}

/** Transform multipart form-data into DTO format */
function transformFormDataToDTO(formData: any): any {
  const data = { ...formData };

  // Parse sizes
  if (typeof data.sizes === 'string') {
    try {
      data.sizes = JSON.parse(data.sizes);
    } catch {
      throw new HttpException('Invalid sizes format', HttpStatus.BAD_REQUEST);
    }
  }
  if (Array.isArray(data.sizes)) {
    data.sizes = data.sizes.map(size => ({
      size: String(size.size || ''),
      price: Number(String(size.price).replace(/[^0-9.]/g, '')) || 0, // pastikan number
      qty: Number(size.qty) || 0,
    }));
  }

  // Parse numeric and boolean fields
  data.mainImageIndex = Number(data.mainImageIndex) || 0;
  if (typeof data.isEnabled === 'string') {
    data.isEnabled = data.isEnabled === 'true';
  } else if (data.isEnabled === undefined) {
    data.isEnabled = true;
  }

  // Parse imagesToDelete
  if (typeof data.imagesToDelete === 'string') {
    try {
      data.imagesToDelete = JSON.parse(data.imagesToDelete);
    } catch {
      data.imagesToDelete = [];
    }
  }

  // Default values
  data.description = data.description || '';
  data.blurDataURL = data.blurDataURL || '';
  if (data.name) data.name = String(data.name).trim();
  if (data.category) data.category = String(data.category).trim();

  return data;
}


@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {}

  /** Create Catalog */
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async createCatalog(
    @Body() formData: any,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ) {
    try {
      const transformedData = transformFormDataToDTO(formData);
      const imageUrls = files?.map(file => `/uploads/catalog_images/${file.filename}`) ?? [];
      const mainIndex = Math.min(Number(transformedData.mainImageIndex) || 0, imageUrls.length - 1);
      const primaryImage = imageUrls[mainIndex] ?? null;

      return await this.catalogService.createCatalog({
        ...transformedData,
        images: imageUrls,
        ...(primaryImage && { image: primaryImage }),
      });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err.message.includes('Invalid file type')) {
        throw new HttpException('Invalid file type.', HttpStatus.BAD_REQUEST);
      }
      if (err?.code === 'P2002') {
        throw new HttpException('Duplicate product name in category.', HttpStatus.CONFLICT);
      }
      throw new HttpException(`Failed to create product: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Get by category */
  @Get('category/:categorySlug')
  findByCategory(@Param('categorySlug') categorySlug: string) {
    return this.catalogService.findByCategory(categorySlug);
  }

  /** Get by slug or serve image */
  @Get(':categorySlug/:productSlug')
  async findBySlug(
    @Param('categorySlug') categorySlug: string,
    @Param('productSlug') productSlug: string,
    @Res() res: any,
  ) {
    if (categorySlug === 'images') {
      return res.redirect(normalizeImagePath(`/uploads/catalog_images/${productSlug}`));
    }
    return res.json(await this.catalogService.findBySlug(categorySlug, productSlug));
  }

  /** Get by ID */
  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);
    return this.catalogService.findOne(parsedId);
  }

  /** Get all or search */
  @Get()
  findAll(@Query() query) {
    return query.search
      ? this.catalogService.searchCatalogs(query.search)
      : this.catalogService.findAll();
  }

  /** Update Catalog */
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 10))
  async update(
    @Param('id') id: string,
    @Body() formData: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      const transformedData = transformFormDataToDTO(formData);
      const updateDto: UpdateCatalogDto = { ...transformedData };

      if (files?.length) {
        updateDto.images = files.map(file =>
          normalizeImagePath(`/uploads/catalog_images/${file.filename}`),
        );

        const existingProduct = await this.catalogService.findOne(+id);
        const allImages = [
          ...(existingProduct.image ? [existingProduct.image] : []),
          ...updateDto.images,
        ];
        if (allImages.length) {
          const mainIndex = updateDto.mainImageIndex || 0;
          updateDto.image = allImages[Math.min(mainIndex, allImages.length - 1)];
        }
      }

      return this.catalogService.updateCatalog(+id, updateDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Failed to update product: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Soft delete */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalogService.remove(+id);
  }

  /** Delete a specific size by its ID */
  @Delete('size/:id')
  removeSize(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new HttpException('Invalid Size ID format', HttpStatus.BAD_REQUEST);
    }
    return this.catalogService.removeSize(parsedId);
  }

  /** Force delete with cart cleanup */
  @Delete(':id/force')
  async forceRemove(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);

    try {
      const cartResult = await this.cartService.removeAllCartItemsByCatalogId(parsedId);
      const deletedCatalog = await this.catalogService.remove(parsedId);

      return {
        success: true,
        message: `Product deleted successfully. ${cartResult.count} cart items removed.`,
        deletedCatalog,
      };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to delete product', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
