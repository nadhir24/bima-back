import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  readonly fullName?: string;

  @IsOptional()
  @IsString()
  readonly phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  readonly uspro_gender?: string;

  @IsOptional()
  readonly uspro_birth_date?: Date;

  @IsOptional()
  readonly roleID?: number;

  @IsOptional()
  @IsString()
  readonly photoProfile?: string;

  @IsOptional()
  readonly addressId?: number; 

  @IsOptional()
  @IsString()
  readonly address_street?: string;

  @IsOptional()
  @IsString()
  readonly address_city?: string;

  @IsOptional()
  @IsString()
  readonly address_province?: string; 

  @IsOptional()
  @IsString()
  readonly address_postalCode?: string;

  @IsOptional()
  @IsString()
  readonly address_country?: string;
}
