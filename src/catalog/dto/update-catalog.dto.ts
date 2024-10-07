// src/catalog/dto/update-catalog.dto.ts

import { IsArray, IsBoolean, IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateCatalogDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

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
  sizes?: {
    size: string;
    price: string; // Ensure this matches your price format
  }[];
}
