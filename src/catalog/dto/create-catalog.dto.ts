import { Type } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, IsArray, ValidateNested, IsOptional } from 'class-validator';

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
  category: string;

  @IsNumber()
  qty: number;

  @IsBoolean()
  isEnabled: boolean;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeDto)
  sizes: SizeDto[];
}