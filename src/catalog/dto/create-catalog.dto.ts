// dto/create-catalog.dto.ts
import { IsString, IsBoolean, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SizeDto {
  @IsString()
  size: string;

  @IsString() // Keep this as a string for formatted prices
  price: string; // Store the price as a formatted string
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
  image: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeDto) // Ensure that sizeDto is correctly transformed
  sizes: SizeDto[];
}
