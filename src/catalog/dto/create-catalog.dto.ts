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

class SizeDto {
  @IsString()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsNotEmpty()
  price: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  })
  @IsNumber()
  @IsOptional()
  qty: number = 0; 
}

export class CreateCatalogDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  blurDataURL?: string = ''; 

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return !!value;
  })
  @IsBoolean()
  isEnabled: boolean = true;  

  @IsString()
  @IsOptional()
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
