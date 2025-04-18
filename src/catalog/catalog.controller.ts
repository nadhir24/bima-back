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
  Put,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import * as sharp from 'sharp';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { CatalogService } from './catalog.service';
import { Catalog } from '@prisma/client';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { Response } from 'express';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Helper function to generate blurDataURL
  private async generateBlurDataURL(imagePath: string): Promise<string> {
    try {
      console.log(`Generating blurDataURL for: ${imagePath}`); // Log the path being used
      const imageBuffer = await sharp(imagePath)
        .resize(20) // Small size for blur placeholder
        .toBuffer();

      // Convert to base64 for data URL
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Error generating blur data URL:', error);
      return null;
    }
  }

  @Get()
  async findAll(): Promise<Catalog[]> {
    return this.catalogService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Catalog> {
    console.log('Received GET request for product ID:', id);
    console.log('Param type:', typeof id);
    try {
      const catalogItem = await this.catalogService.findOne(id);
      console.log('Found product:', catalogItem);

      if (!catalogItem) {
        throw new HttpException('Catalog item not found', HttpStatus.NOT_FOUND);
      }
      return catalogItem;
    } catch (error) {
      console.error('Error finding product:', {
        error: error.message,
        stack: error.stack
      });
      // Handle potential Prisma errors or other issues
      if (error instanceof HttpException) {
        throw error; // Re-throw known HTTP exceptions
      }
      console.error(`Error fetching catalog with ID ${id}:`, error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      if (image) {
        try {
          const imagePath = join(
            process.cwd(),
            'uploads',
            'catalog_images',
            image.filename,
          );
          blurDataURL = await this.generateBlurDataURL(imagePath);
        } catch (error) {
          console.error('Error generating blur data URL:', error);
        }
      }

      // Parse sizes from formData string
      let parsedSizes: any[];
      try {
        if (typeof formData.sizes !== 'string') {
          // This case might happen if not using multipart/form-data, but good to check
           throw new Error('Expected sizes data to be a JSON string.');
        }
        parsedSizes = JSON.parse(formData.sizes);
        if (!Array.isArray(parsedSizes)) {
          throw new Error('Parsed sizes data is not an array.');
        }
      } catch (parseError) {
        console.error('Error parsing sizes from formData:', parseError);
        console.error('Received formData.sizes:', formData.sizes);
        throw new HttpException(
          `Invalid format for sizes data: ${parseError.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const isEnabled = formData.isEnabled === 'true';
      const productSlug = formData.name.toLowerCase().replace(/\s+/g, '-');
      const categorySlug = formData.category.toLowerCase().replace(/\s+/g, '-');

      const createCatalogDto: CreateCatalogDto = {
        name: formData.name,
        category: formData.category,
        categorySlug,
        productSlug,
        sizes: parsedSizes.map((sizeData) => ({
          size: sizeData.size,
          price: String(parseFloat(String(sizeData.price).replace(/[^\d.-]/g, ''))),
          qty: parseInt(sizeData.qty, 10) || 0,
        })),
        isEnabled,
        image: finalImageUrl,
        blurDataURL,
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

  @Put(':id')
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

      if (image) {
        try {
          const imagePath = join(
            process.cwd(),
            'uploads',
            'catalog_images',
            image.filename,
          );
          blurDataURL = await this.generateBlurDataURL(imagePath);
        } catch (error) {
          console.error('Error generating blur data URL:', error);
        }
      }

      const isEnabled = formData.isEnabled === 'true';

      let sizes;
      let processedSizes;
      try {
        sizes =
          typeof formData.sizes === 'string'
            ? JSON.parse(formData.sizes)
            : formData.sizes;

        if (!Array.isArray(sizes)) {
          throw new Error('Sizes must be an array');
        }

        processedSizes = sizes.map((sizeData: any) => {
          if (!sizeData || typeof sizeData !== 'object') {
            throw new Error('Invalid size data format');
          }

          const id = sizeData.id;
          if (!id) {
            throw new Error('Size ID is required');
          }

          return {
            id: parseInt(id, 10),
            size: sizeData.size,
            qty: parseInt(sizeData.qty, 10) || 0,
            price: sizeData.price, // Perubahan di sini: jangan hapus karakter non-angka
          };
        });

        sizes = processedSizes;
      } catch (error) {
        console.error('Error processing sizes:', error);
        throw new HttpException(
          `Failed to process size data: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

  

      if (processedSizes.length === 0) {
        console.error('Update catalog failed: No sizes provided in request');
        console.error('Received formData:', formData);
        console.error('Processed sizes:', sizes);
        throw new HttpException(
          'At least one size is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const updateCatalogDto: UpdateCatalogDto = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        sizes,
        isEnabled,
        image: finalImageUrl,
        blurDataURL,
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

  @Get('products')
  async getProducts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    console.log(`Backend Received - Page: ${page} (Type: ${typeof page}), Limit: ${limit} (Type: ${typeof limit})`); // <-- Add this log
    return this.catalogService.findAllWithPagination({ page, limit });
  }
}
