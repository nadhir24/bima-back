import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

/**
 * Sub-DTO untuk ukuran produk (sizes)
 */
class SizeDto {
  @IsString()
  @IsNotEmpty({ message: 'Size value is required' })
  size: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace(/\D/g, ''), 10); // Hapus karakter non-numeric
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Price must be a valid number' })
  @IsNotEmpty({ message: 'Price is required' })
  price: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Quantity must be a valid number' })
  @IsOptional()
  qty: number = 0; // Default to 0 if not provided
}

/**
 * Main DTO untuk membuat katalog produk
 */
export class CreateCatalogDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true'; // Convert string "true" to boolean
    }
    return !!value; // Ensure it's always a boolean
  })
  @IsBoolean({ message: 'isEnabled must be a boolean' })
  isEnabled: boolean = true;

  @IsArray()
  @ValidateNested({ each: true, message: 'Sizes must be an array of valid size objects' })
  @Type(() => SizeDto)
  sizes: SizeDto[];

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Main image index must be a valid number' })
  @IsOptional()
  mainImageIndex?: number = 0; // Default to 0 if not provided

  @IsOptional()
  images?: string[]; // Optional field for image URLs

  @IsOptional()
  image?: string; // Optional field for the main image URL
}