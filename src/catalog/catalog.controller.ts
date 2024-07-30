import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { CatalogService } from './catalog.service';
import { multerConfig } from 'multer.config'; // Ensure correct import path
import { Catalog, Prisma } from '@prisma/client';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('/create')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async createCatalog(
    @Body() formData: any, // Use `any` type for form-data
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const finalImageUrl = image ? image.path : 'default.jpg';

      // Parse form-data fields
      const createCatalogDto: CreateCatalogDto = {
        name: formData.name,
        category: formData.category,
        qty: parseInt(formData.qty, 10), // Parse qty as integer
        price: formData.price.replace(/[^\d.-]/g, ''), // Remove non-numeric characters from price
        isEnabled: formData.isEnabled === 'true', // Convert to boolean
        image: finalImageUrl,
      };

      // Create catalog entry
      const createdCatalog = await this.catalogService.createCatalog(createCatalogDto);

      // Format the price back to Rp format for the response
      const formattedPrice = `Rp${parseFloat(createCatalogDto.price).toLocaleString('id-ID', { minimumFractionDigits: 3 }).replace('.', ',')}`;

      // Return the catalog entry with formatted price
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

  async purchase(
    userId: number,
    catalogId: number,
    quantity: number,
  ): Promise<void> {
    try {
      // Lakukan operasi untuk membuat pembelian, dan setelah berhasil,
      // panggil updateQuantity untuk mengurangi qty dari katalog yang sesuai.

      // Contoh penggunaan:
      // Lakukan validasi dan proses pembelian sesuai kebutuhan aplikasi Anda.

      await this.catalogService.updateQuantity(catalogId, quantity);

      // Setelah berhasil, lakukan proses pembelian ke entitas yang sesuai (mungkin Payment, dll).
    } catch (error) {
      throw new HttpException(
        'Failed to process purchase',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
