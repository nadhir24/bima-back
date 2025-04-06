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

  @IsNumber()
  qty: number;
}

export class CreateCatalogDto {
  @IsString()
  name: string;

  @IsString()
  blurDataURL?: string;

  @IsString()
  category: string;

  @IsString()
  description: string;

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
