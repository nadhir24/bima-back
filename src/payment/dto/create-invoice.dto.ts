import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShippingAddressDto } from './create-shipping-address.dto';

export class CreateInvoiceCustomerAddressDto {
  @IsOptional()
  @IsString()
  street_line1?: string;

  @IsOptional()
  @IsString()
  street_line2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province_state?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  country_code?: string;
}

export class CreateInvoiceCustomerDto {
  @IsOptional()
  @IsString()
  given_names?: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile_number?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInvoiceCustomerAddressDto) 
  address?: CreateInvoiceCustomerAddressDto;
}

export class CreateInvoiceItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsNumber()
  catalogId?: number;

  @IsOptional()
  @IsNumber()
  sizeId?: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  @IsEnum(['IDR', 'USD'])
  currency: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @IsOptional()
  @IsString()
  guestId?: string;

  @ValidateNested()
  @Type(() => CreateInvoiceCustomerDto)
  customer: CreateInvoiceCustomerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateShippingAddressDto)
  shippingAddress?: CreateShippingAddressDto;

  @IsOptional()
  @IsNumber()
  shippingCost?: number;

}
