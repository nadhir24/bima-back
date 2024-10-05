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

  // Fetch all catalogs
  @Get('findall')
  async findAll(): Promise<Catalog[]> {
    return this.catalogService.findAll();
  }

  // Create new catalog with image upload
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
      // Correctly format image URL
      const finalImageUrl = image ? `/catalog/${image.filename}` : null;

      // Ensure isEnabled is a boolean value
      const isEnabled = formData.isEnabled === 'true';

      // Create DTO object, converting size and price as needed
      const createCatalogDto: CreateCatalogDto = {
        name: formData.name,
        category: formData.category,
        sizes: formData.sizes.map((sizeData) => ({
          size: sizeData.size, // Ensure size is a string
          price: parseFloat(sizeData.price.replace(/[^\d.-]/g, '')), // Convert price to a number
        })),
        qty: parseInt(formData.qty, 10),
        isEnabled: isEnabled,
        image: finalImageUrl,
      };

      // Call the service to create a new catalog entry
      const createdCatalog =
        await this.catalogService.createCatalog(createCatalogDto);
      return createdCatalog; // Return the newly created catalog entry
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Fetch catalog by slug
  @Get(':category/:slug') // Change this line
  async findByCategoryAndSlug(
    @Param('category') category: string,
    @Param('slug') slug: string,
  ): Promise<Catalog> {
    const catalog = await this.catalogService.findByCategoryAndSlug(
      category,
      slug,
    );
    if (!catalog) {
      throw new HttpException('Catalog entry not found', HttpStatus.NOT_FOUND);
    }
    return catalog;
  }

  // Serve uploaded image files
  // Serve uploaded image files
  @Get(':imgpath')
  seeUploadedFile(@Param('imgpath') image: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'catalog_images', image);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send('File not found.');
      }
    });
  }

  // Find catalog by ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Catalog> {
      return await this.catalogService.findOne(+id);
  }    

  // Update catalog entry
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.CatalogUpdateInput,
  ): Promise<Catalog> {
    return this.catalogService.update(+id, data);
  }

  // Delete catalog by ID
  @Delete('/:id')
  async remove(@Param('id') id: string): Promise<Catalog> {
    return this.catalogService.remove(+id);
  }

  // Handle catalog purchase and update quantity
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
