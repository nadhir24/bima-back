import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Inject,
  forwardRef,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CatalogService } from './catalog.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { ValidationPipe } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { PrismaService } from 'prisma/prisma.service';

function transformFormDataToDTO(formData: any): any {
  const transformedData = { ...formData };

  if (typeof transformedData.sizes === 'string') {
    try {
      transformedData.sizes = JSON.parse(transformedData.sizes);
    } catch (error) {
      throw new HttpException(
        'Invalid sizes format. Expected a valid JSON array.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  
  if (typeof transformedData.mainImageIndex === 'string') {
    transformedData.mainImageIndex = parseInt(transformedData.mainImageIndex, 10);
    if (isNaN(transformedData.mainImageIndex)) {
      transformedData.mainImageIndex = 0;
    }
  }
  
  if (typeof transformedData.imagesToDelete === 'string') {
    try {
      transformedData.imagesToDelete = JSON.parse(transformedData.imagesToDelete);
    } catch (error) {
      transformedData.imagesToDelete = [];
    }
  }

  if (typeof transformedData.isEnabled === 'string') {
    transformedData.isEnabled = transformedData.isEnabled === 'true';
  }

  if (!transformedData.blurDataURL) {
    transformedData.blurDataURL = '';
  }

  return transformedData;
}

// Helper function to ensure correct image URL format
function normalizeImagePath(path: string): string {
  // Ensure the path starts with a single slash
  return path.replace(/^\/*/, '/');
}

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(
    @Body() formData: any,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ) {
    try {
      // Debug logging
      console.log('=== DEBUG: Create Catalog Request ===');
      console.log('Form data received:', formData);
      console.log('Files received:', files?.map(f => ({ 
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        fieldname: f.fieldname 
      })));
      
      const transformedData = transformFormDataToDTO(formData);
      console.log('Transformed data:', transformedData);

      const validationPipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: true,
        forbidUnknownValues: false,
      });

      // Validate and transform into DTO
      const createCatalogDto = (await validationPipe.transform(
        transformedData,
        { metatype: CreateCatalogDto, type: 'body' },
      )) as CreateCatalogDto;
      
      console.log('DTO after validation:', createCatalogDto);

      if (files && files.length > 0) {
        console.log(`Processing ${files.length} uploaded files`);
        createCatalogDto.images = files.map(file => 
          normalizeImagePath(`/uploads/catalog_images/${file.filename}`)
        );
        
        // Also set the primary image for backward compatibility
        if (createCatalogDto.images.length > 0) {
          const mainIndex = createCatalogDto.mainImageIndex || 0;
          console.log(`Setting main image index: ${mainIndex}`);
          createCatalogDto.image = createCatalogDto.images[
            Math.min(mainIndex, createCatalogDto.images.length - 1)
          ];
          console.log(`Main image set to: ${createCatalogDto.image}`);
        }
      }

      const result = await this.catalogService.createCatalog(createCatalogDto);
      return result;
    } catch (error) {
      console.error('Error in catalog creation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  @Get('date-range')
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      return this.catalogService.findByDateRange(
        new Date(startDate),
        new Date(endDate),
      );
    } catch (error) {
      throw new HttpException(
        'Failed to search products by date range',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('category/:categorySlug')
  findByCategory(@Param('categorySlug') categorySlug: string) {
    return this.catalogService.findByCategory(categorySlug);
  }

  @Get(':categorySlug/:productSlug')
  async findBySlug(
    @Param('categorySlug') categorySlug: string,
    @Param('productSlug') productSlug: string,
    @Res() res: any,
  ) {
    if (categorySlug === 'images') {
      return res.redirect(normalizeImagePath(`/uploads/catalog_images/${productSlug}`));
    }

    const catalog = await this.catalogService.findBySlug(
      categorySlug,
      productSlug,
    );
    return res.json(catalog);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);
    }
    return this.catalogService.findOne(parsedId);
  }

  @Get()
  findAll(@Query() query) {
    if (query.search) {
      return this.catalogService.searchCatalogs(query.search);
    }
    return this.catalogService.findAll();
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 10))
  async update(
    @Param('id') id: string,
    @Body() formData: any,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ) {
    try {
      const transformedData = transformFormDataToDTO(formData);

      const validationPipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: true,
      });

      const updateCatalogDto = (await validationPipe.transform(
        transformedData,
        { metatype: UpdateCatalogDto, type: 'body' },
      )) as UpdateCatalogDto;

      if (files && files.length > 0) {
        updateCatalogDto.images = files.map(file => 
          normalizeImagePath(`/uploads/catalog_images/${file.filename}`)
        );
        
        // Also update the primary image for backward compatibility
        const existingProduct = await this.catalogService.findOne(+id);
        const allImages = [
          ...(existingProduct.productImages?.map(img => img.imageUrl) || []),
          ...updateCatalogDto.images
        ];
        
        if (allImages.length > 0) {
          const mainIndex = updateCatalogDto.mainImageIndex || 0;
          updateCatalogDto.image = allImages[
            Math.min(mainIndex, allImages.length - 1)
          ];
        }
      }

      return this.catalogService.updateCatalog(+id, updateCatalogDto);
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.BAD_REQUEST
      ) {
        const response = error.getResponse();
      }
      throw error;
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalogService.remove(+id);
  }


  @Delete(':id/force')
  async forceRemove(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);
    }

    try {
      
      const cartResult =
        await this.cartService.removeAllCartItemsByCatalogId(parsedId);

      const deletedCatalog = await this.catalogService.remove(parsedId);

      return {
        success: true,
        message: `Product deleted successfully. ${cartResult.count} cart items were removed.`,
        deletedCatalog,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete product',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
