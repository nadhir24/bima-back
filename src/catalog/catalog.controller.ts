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
  Put,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { Response } from 'express';
import { CatalogService } from './catalog.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { Catalog, Prisma } from '@prisma/client';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('findall')
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
          const filename: string = file.originalname.split('.')[0];
          const extension: string = extname(file.originalname);
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
      const finalImageUrl = image
        ? `/uploads/catalog_images/${image.filename}`
        : null;

      const createCatalogDto: CreateCatalogDto = {
        name: formData.name,
        category: formData.category,
        size: formData.size,
        qty: parseInt(formData.qty, 10),
        price: formData.price.replace(/[^\d.-]/g, ''),
        isEnabled: formData.isEnabled === 'true',
        image: finalImageUrl,
      };

      const createdCatalog =
        await this.catalogService.createCatalog(createCatalogDto);

      const formattedPrice = `Rp${parseFloat(createCatalogDto.price)
        .toLocaleString('id-ID', {
          minimumFractionDigits: 3,
        })
        .replace('.', ',')}`;

      return {
        ...createdCatalog,
        price: formattedPrice,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':imgpath')
  seeUploadedFile(@Param('imgpath') image: string, @Res() res: Response) {
    const filePath = join(
      __dirname,
      '..',
      '..',
      '..',
      'uploads',
      'catalog_images',
      image,
    );
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send('File not found.');
      }
    });
  }

  @Get('find/:id')
  async findOne(@Param('id') id: string): Promise<Catalog> {
    return this.catalogService.findOne(+id); // Convert string to number
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.CatalogUpdateInput,
  ): Promise<Catalog> {
    return this.catalogService.update(+id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Catalog> {
    return this.catalogService.remove(+id);
  }

  @Post('purchase')
  async purchase(
    @Body('userId') userId: number,
    @Body('catalogId') catalogId: number,
    @Body('quantity') quantity: number,
  ): Promise<void> {
    try {
      await this.catalogService.updateQuantity(catalogId, quantity);
    } catch (error) {
      throw new HttpException(
        'Failed to process purchase',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('detail')
  async getProductDetail(
    @Query('category') category: string,
    @Query('name') name: string,
  ): Promise<Catalog> {
    if (!name || !category) {
      throw new HttpException('Missing query parameters', HttpStatus.BAD_REQUEST);
    }
    return this.catalogService.findByNameAndCategory(name, category);
  }
  
}
