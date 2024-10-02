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
import { Prisma } from '@prisma/client';
import { FindCatalogDto } from './dto/find-catalog.dto';
import { Catalog } from '@prisma/client';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('allitems')
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

    // Ensure isEnabled is a boolean
    const isEnabled = formData.isEnabled === 'true';

    // Create DTO object with dynamic sizes
    const createCatalogDto: CreateCatalogDto = {
      name: formData.name,
      category: formData.category,
      sizes: formData.sizes.map((sizeData) => ({
        size: sizeData.size, // size should be a string
        price: parseFloat(sizeData.price.replace(/[^\d.-]/g, '')), // Ensure price is a number
      })),
      qty: parseInt(formData.qty, 10),
      isEnabled: isEnabled,
      image: finalImageUrl,
    };

    // Call the service to create the catalog entry
    const createdCatalog = await this.catalogService.createCatalog(createCatalogDto);
    console.log('isEnabled:', isEnabled); // Check the value of isEnabled

    return createdCatalog; // Return the created catalog entry
  } catch (error) {
    throw new HttpException(
      error.message || 'Failed to create catalog entry',
      HttpStatus.BAD_REQUEST,
    );
  }
}


  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<Catalog> {
    const catalog = await this.catalogService.findBySlug(slug);
    if (!catalog) {
      throw new HttpException('Catalog entry not found', HttpStatus.NOT_FOUND);
    }
    return catalog;
  }

  @Get('image/:imgpath')
  seeUploadedFile(@Param('imgpath') image: string, @Res() res: Response) {
    const filePath = join(__dirname, '..', '..', '..', 'uploads', 'catalog_images', image);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send('File not found.');
      }
    });
  }

  @Get('find/:id')
  async findOne(@Param('id') id: string): Promise<Catalog> {
    return this.catalogService.findOne(+id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.CatalogUpdateInput,
  ): Promise<Catalog> {
    return this.catalogService.update(+id, data);
  }

  @Get('detail')
  async getProdukDetail(
    @Query() findCatalogDto: FindCatalogDto,
  ): Promise<Catalog> {
    return this.catalogService.findByNameAndCategory(findCatalogDto);
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
}
