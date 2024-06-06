import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCatalogDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10)) // Ensure qty is always parsed as an integer
  qty: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === 'yes') // Convert to boolean
  isEnabled?: boolean;

  @IsString()
  @IsOptional()
  image?: string;
}
