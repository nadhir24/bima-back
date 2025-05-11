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
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Inject,
  forwardRef,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() formData: any,
    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    try {
      const transformedData = transformFormDataToDTO(formData);

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

      if (file) {
        createCatalogDto.image = normalizeImagePath(`/uploads/catalog_images/${file.filename}`);
      }

      const result = await this.catalogService.createCatalog(createCatalogDto);
      return result;
    } catch (error) {
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
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() formData: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
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

      if (file) {
        updateCatalogDto.image = normalizeImagePath(`/uploads/catalog_images/${file.filename}`);
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
