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
  readonly uspro_birt_date?: Date;

  @IsOptional()
  readonly roleID?: number;

  @IsOptional()
  @IsString()
  readonly photoProfile?: string;
}
