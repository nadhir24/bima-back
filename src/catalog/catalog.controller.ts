import {
  Controller,
  Post,
  Body,
  UploadedFile,
  HttpException,
  HttpStatus,
  UseInterceptors,
  Get,
  Param,
  Res,
  Delete,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import * as sharp from 'sharp';
import { CatalogService } from './catalog.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { Catalog } from '@prisma/client';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { Response } from 'express';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Helper function to generate blurDataURL

  @Get()
  async findAll(): Promise<Catalog[]> {
    return this.catalogService.findAll();
  }

  @Get('images/:imgpath')
  seeUploadedFile(@Param('imgpath') image: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'catalog_images', image);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send('File not found.');
      }
    });
  }

  @Get(':categorySlug/:productSlug')
  async getCatalogItem(
    @Param('categorySlug') categorySlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    console.log(
      `Fetching item for categorySlug: ${categorySlug}, productSlug: ${productSlug}`,
    );

    const catalogItem = await this.catalogService.findBySlug(
      categorySlug,
      productSlug,
    );

    if (!catalogItem) {
      throw new HttpException('Catalog item not found', HttpStatus.NOT_FOUND);
    }

    return catalogItem;
  }
  @Post('create')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(
          __dirname,
          '..',
          '..',
          '..',
          'uploads',
          'catalog_images',
        ),
        filename: (req, file, cb) => {
          const filename = file.originalname.split('.')[0];
          const extension = extname(file.originalname);
          cb(null, `${filename}-${Date.now()}${extension}`);
        },
      }),
    }),
  )
  async createCatalog(
    @Body() formData: any,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const finalImageUrl = image ? `/catalog/images/${image.filename}` : null;
      let blurDataURL = null;

      // Generate blur data URL using plaiceholder
      
      const isEnabled = formData.isEnabled === 'true';
      const productSlug = formData.name.toLowerCase().replace(/\s+/g, '-');
      const categorySlug = formData.category.toLowerCase().replace(/\s+/g, '-');

      const createCatalogDto: CreateCatalogDto = {
        name: formData.name,
        category: formData.category,
        categorySlug,
        productSlug,
        sizes: formData.sizes.map((sizeData) => ({
          size: sizeData.size,
          price: parseFloat(sizeData.price.replace(/[^\d.-]/g, '')),
        })),
        qty: parseInt(formData.qty, 10),
        isEnabled,
        image: finalImageUrl,
        blurDataURL, // Include the blur data URL
        description: formData.description,
      };

      return await this.catalogService.createCatalog(createCatalogDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(
          __dirname,
          '..',
          '..',
          '..',
          'uploads',
          'catalog_images',
        ),
        filename: (req, file, cb) => {
          const filename = file.originalname.split('.')[0];
          const extension = extname(file.originalname);
          cb(null, `${filename}-${Date.now()}${extension}`);
        },
      }),
    }),
  )
  async updateCatalog(
    @Param('id') id: string,
    @Body() formData: any,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Catalog> {
    try {
      const finalImageUrl = image
        ? `/catalog/images/${image.filename}`
        : formData.existingImage;

      let blurDataURL = null;

      // Generate blur data URL if a new image is provided
      
      const isEnabled = formData.isEnabled === 'true';

      const updateCatalogDto: UpdateCatalogDto = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        sizes: Array.isArray(formData.sizes)
          ? formData.sizes.map((sizeData: any) => ({
              size: sizeData.size,
              price: parseFloat(sizeData.price.replace(/[^\d.-]/g, '')),
            }))
          : [],
        qty:
          formData.qty !== undefined ? parseInt(formData.qty, 10) : undefined,
        isEnabled,
        image: finalImageUrl,
      };

      const numericId = parseInt(id, 10);
      return await this.catalogService.updateCatalog(
        numericId,
        updateCatalogDto,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Catalog> {
    return this.catalogService.remove(+id);
  }
}
