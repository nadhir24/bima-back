import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateShippingAddressDto {
  @IsNotEmpty()
  @IsString()
  street_line1: string;

  @IsOptional()
  @IsString()
  street_line2?: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  province_state: string;

  @IsNotEmpty()
  @IsString()
  postal_code: string;

  @IsNotEmpty()
  @IsString()
  country_code: string;
}
