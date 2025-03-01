import { IsOptional, IsString, IsEmail, IsNotEmpty, ValidateNested, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingAddressDto } from './shipping-address.dto'; // ✅ IMPORT ShippingAddressDto dari file terpisah

export class CreateCheckoutDto {
  @IsOptional()
  @IsUUID()
  guestId?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsEmail()
  userEmail?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ShippingAddressDto) // ✅ Sekarang ShippingAddressDto sudah didefinisikan dan di-import
  shippingAddress: ShippingAddressDto;
}