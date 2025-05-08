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
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogService } from './catalog.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { ValidationPipe } from '@nestjs/common';
import { CartService } from '../cart/cart.service'; 
import { PrismaService } from 'prisma/prisma.service';

// Transform form data to proper DTO format
function transformFormDataToDTO(formData: any): any {
  const transformedData = { ...formData };

  // Convert sizes from string to array if needed
  if (typeof transformedData.sizes === 'string') {
    try {
      transformedData.sizes = JSON.parse(transformedData.sizes);
    } catch (error) {
      throw new HttpException(
        'Invalid sizes format. Expected a valid JSON array.',
        HttpStatus.BAD_REQUEST
      );
    }
  }
  
  // Convert isEnabled from string to boolean
  if (typeof transformedData.isEnabled === 'string') {
    transformedData.isEnabled = transformedData.isEnabled === 'true';
  }
  
  // Set default blurDataURL if not present
  if (!transformedData.blurDataURL) {
    transformedData.blurDataURL = '';
  }
  
  return transformedData;
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
    @UploadedFile(
      /* // Temporarily comment out the pipe
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
      */
    )
    file?: Express.Multer.File
  ) {
    // console.log('Uploaded File Raw:', file); // Add this maybe?
    console.log('=== CatalogController.create ===');
    console.log('Raw Request Body:', JSON.stringify(formData, null, 2));
    
    try {
      // Transform form data before validation
      const transformedData = transformFormDataToDTO(formData);
      console.log('Transformed Data:', JSON.stringify(transformedData, null, 2));
      
      // Use a validation pipe manually
      const validationPipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false, // Change to false to see all fields
        skipMissingProperties: true, // Skip validation for missing properties
        forbidUnknownValues: false, // Don't reject unknown values
      });
      
      // Validate and transform into DTO
      const createCatalogDto = await validationPipe.transform(
        transformedData, 
        { metatype: CreateCatalogDto, type: 'body' }
      ) as CreateCatalogDto;
      
      console.log('Validated DTO:', JSON.stringify(createCatalogDto, null, 2));
      console.log('Uploaded File:', file ? file.filename : 'No file uploaded');
      
      // Add file path to DTO if file exists
      if (file) {
        createCatalogDto.image = `/uploads/catalog_images/${file.filename}`;
        console.log('Added image path to DTO:', createCatalogDto.image);
      }
      
      const result = await this.catalogService.createCatalog(createCatalogDto);
      console.log('Create catalog success');
      return result;
    } catch (error) {
      console.error('Create catalog validation error:', error);
      
      // Enhanced error logging
      if (error.response && error.response.message) {
        console.error('Validation errors:', JSON.stringify(error.response.message, null, 2));
        
        // Log more details about the sizes array if it's causing issues
        if (formData.sizes) {
          console.error('Sizes array details:');
          console.error('- Original:', formData.sizes);
          console.error('- Type:', typeof formData.sizes);
        }
      }
      
      throw error;
    }
  }

  @Get('date-range')
  findByDateRange(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    console.log('=== CatalogController.findByDateRange ===');
    console.log('Query params:', { startDate, endDate });
    try {
      return this.catalogService.findByDateRange(new Date(startDate), new Date(endDate));
    } catch (error) {
      console.error('Find by date range error:', error);
      throw new HttpException(
        'Failed to search products by date range',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('category/:categorySlug')
  findByCategory(@Param('categorySlug') categorySlug: string) {
    console.log('=== CatalogController.findByCategory ===');
    console.log('Category slug:', categorySlug);
    return this.catalogService.findByCategory(categorySlug);
  }

  @Get(':categorySlug/:productSlug')
  async findBySlug(
    @Param('categorySlug') categorySlug: string,
    @Param('productSlug') productSlug: string,
    @Res() res: any
  ) {
    console.log('=== CatalogController.findBySlug ===');
    console.log('Params:', { categorySlug, productSlug });
    
    // Khusus untuk permintaan gambar yang salah rute
    if (categorySlug === 'images') {
      console.log('Detected image request, redirecting to proper image path');
      
      // Redirect ke URL yang benar untuk gambar
      return res.redirect(`/uploads/catalog_images/${productSlug}`);
    }

    // Untuk permintaan katalog normal
    const catalog = await this.catalogService.findBySlug(categorySlug, productSlug);
    return res.json(catalog);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log('=== CatalogController.findOne ===');
    console.log('ID:', id);
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      console.error('Invalid ID format:', id);
      throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);
    }
    return this.catalogService.findOne(parsedId);
  }

  @Get()
  findAll(@Query() query) {
    console.log('=== CatalogController.findAll ===');
    console.log('Query:', query);
    // If search query parameter exists, use it to search products
    if (query.search) {
      console.log('Searching catalogs with query:', query.search);
      return this.catalogService.searchCatalogs(query.search);
    }
    console.log('Getting all catalogs');
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
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File
  ) {
    console.log('=== CatalogController.update ===');
    console.log('ID:', id);
    console.log('Raw Request Body:', JSON.stringify(formData, null, 2));
    
    try {
      // Transform form data before validation
      const transformedData = transformFormDataToDTO(formData);
      console.log('Transformed Data:', JSON.stringify(transformedData, null, 2));
      
      // Use a validation pipe manually
      const validationPipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: true
      });
      
      // Validate and transform into DTO
      const updateCatalogDto = await validationPipe.transform(
        transformedData, 
        { metatype: UpdateCatalogDto, type: 'body' }
      ) as UpdateCatalogDto;
      
      console.log('Validated DTO:', JSON.stringify(updateCatalogDto, null, 2));
      console.log('Uploaded File:', file ? file.filename : 'No file uploaded');
      
      // Add file path to DTO if file exists
      if (file) {
        updateCatalogDto.image = `/uploads/catalog_images/${file.filename}`;
        console.log('Added image path to DTO:', updateCatalogDto.image);
      }
      
      return this.catalogService.updateCatalog(+id, updateCatalogDto);
    } catch (error) {
      console.error('Update catalog error:', error);
      // Log validation details if available
      if (error instanceof HttpException && error.getStatus() === HttpStatus.BAD_REQUEST) {
          const response = error.getResponse();
          if (typeof response === 'object' && response !== null && 'message' in response) {
              console.error('Validation errors:', JSON.stringify(response['message'], null, 2));
          } else {
              console.error('Validation error details:', response);
          }
      }
      throw error;
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    console.log('=== CatalogController.remove ===');
    console.log('ID:', id);
    return this.catalogService.remove(+id);
  }

  /**
   * Forcefully delete a catalog item by first clearing all cart items that reference it.
   * This is an admin-only operation that should be used with caution.
   */
  @Delete(':id/force')
  async forceRemove(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    
    if (isNaN(parsedId)) {
      console.error('Invalid ID format for force delete:', id);
      throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);
    }
    
    console.log('=== CatalogController.forceRemove ===');
    console.log('ID:', parsedId);
    
    try {
      // First, remove all cart items for this catalog
      const cartResult = await this.cartService.removeAllCartItemsByCatalogId(parsedId);
      console.log(`Removed ${cartResult.count} cart items`);
      
      // Then, delete the catalog
      const deletedCatalog = await this.catalogService.remove(parsedId);
      
      return {
        success: true,
        message: `Product deleted successfully. ${cartResult.count} cart items were removed.`,
        deletedCatalog
      };
    } catch (error) {
      console.error('Force removal error:', error);
      
      throw new HttpException(
        error.message || 'Failed to delete product',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
     