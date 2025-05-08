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

// 1. CreateInvoiceCustomerAddressDto (DEKLARASIKAN PALING ATAS)
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

// 2. CreateInvoiceCustomerDto (DEKLARASIKAN SETELAH CreateInvoiceCustomerAddressDto)
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
  @Type(() => CreateInvoiceCustomerAddressDto) // <--- Sekarang CreateInvoiceCustomerAddressDto SUDAH DIDEKLARASIKAN
  address?: CreateInvoiceCustomerAddressDto;
}

// 3. CreateInvoiceItemDto (URUTAN TIDAK MASALAH)
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

// 4. CreateInvoiceDto (DEKLARASIKAN PALING BAWAH, SETELAH SEMUA DTO LAIN YANG DIPAKAI)
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
