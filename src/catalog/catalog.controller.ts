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
import { Response } from 'express';
import { CatalogService } from './catalog.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { Catalog } from '@prisma/client';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async findAll(): Promise<Catalog[]> {
    return this.catalogService.findAll();
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
      const finalImageUrl = image ? `/catalog/${image.filename}` : null;
      const isEnabled = formData.isEnabled === 'true';
      const productSlug = formData.name.toLowerCase().replace(/\s+/g, '-');
      const categorySlug = formData.category.toLowerCase().replace(/\s+/g, '-');
      const createCatalogDto: CreateCatalogDto = {
        name: formData.name,
        category: formData.category,
        categorySlug, // Include category slug
        productSlug, // Include product slug
        sizes: formData.sizes.map((sizeData) => ({
          size: sizeData.size,
          price: parseFloat(sizeData.price.replace(/[^\d.-]/g, '')),
        })),
        qty: parseInt(formData.qty, 10),
        isEnabled,
        image: finalImageUrl,
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

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Catalog> {
    return this.catalogService.findOne(+id);
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
      const finalImageUrl = image ? `/catalog/images/${image.filename}` : null;
      const isEnabled = formData.isEnabled === 'true';
  
      // Prepare the update DTO
      const updateCatalogDto: UpdateCatalogDto = {
        name: formData.name,
        category: formData.category,
        description: formData.description, // Corrected from formData.category to formData.description
        sizes: Array.isArray(formData.sizes) ? 
          formData.sizes.map((sizeData: any) => ({
            size: sizeData.size,
            price: parseFloat(sizeData.price.replace(/[^\d.-]/g, '')), // Handle price parsing safely
          })) : [], // Fallback to an empty array if sizes is undefined
          qty: formData.qty !== undefined ? parseInt(formData.qty, 10) : undefined,
          isEnabled,
        image: finalImageUrl || formData.existingImage, // Fallback to existing image if no new image is uploaded
      };
  
      const numericId = parseInt(id, 10);
      return await this.catalogService.updateCatalog(numericId, updateCatalogDto);
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
}
