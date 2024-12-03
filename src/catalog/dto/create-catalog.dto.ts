import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';

class SizeDto {
  @IsString()
  size: string;

  @IsString()
  price: string;
}

export class CreateCatalogDto {
  @IsString()
  name: string;

  @IsString()
  blurDataURL?: string; // Add this line

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsNumber()
  qty: number;

  @IsBoolean()
  isEnabled: boolean;

  @IsString()
  @IsOptional()
  image?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  productSlug?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeDto)
  sizes: SizeDto[];
}
