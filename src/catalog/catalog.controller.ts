import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { CatalogService } from './catalog.service';
import { multerConfig } from 'multer.config';
import { PrismaService } from 'prisma/prisma.service';
import { Catalog, Prisma } from '@prisma/client';
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('/create')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async createCatalog(
    @Body() createCatalogDto: CreateCatalogDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<any> {
    try {
      // Logging data for debugging
      console.log('Received CreateCatalogDto:', createCatalogDto);
      console.log('Uploaded file:', image);

      // Determine the final image path or use a default
      const finalImageUrl = image ? image.path : 'default.jpg';

      // Create the catalog entry
      const createdCatalog = await this.catalogService.createCatalog({
        ...createCatalogDto,
        image: finalImageUrl,
      });

      // Return the created catalog entry
      return createdCatalog;
    } catch (error) {
      console.error('Error creating catalog entry:', error);
      throw new HttpException(
        'Failed to create catalog entry',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll(): Promise<Catalog[]> {
    return this.catalogService.findAll();
  }

  @Get(':id')
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

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Catalog> {
    return this.catalogService.remove(+id);
  }
}
