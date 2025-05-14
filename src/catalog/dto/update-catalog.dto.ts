// src/catalog/dto/update-catalog.dto.ts

import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCatalogDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  productSlug?: string;

  @IsOptional()
  @IsInt()
  qty?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  image?: string;
  
  @IsArray()
  @IsOptional()
  images?: string[] = [];
  
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  })
  mainImageIndex?: number = 0;
  
  @IsArray()
  @IsOptional()
  imagesToDelete?: number[] = [];

  @IsArray()
  @IsOptional()
    sizes?: {
    id?: number;
    size?: string;
    price?: string;
    qty?: number;
  }[];
  
  @IsArray()
  @IsOptional()
  sizesToDelete?: number[] = [];

  blurDataURL?: string;
}
