import { IsOptional, IsEmail, IsString } from 'class-validator';

export class UpdateCustomerDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone_number?: string;

    @IsOptional()
    @IsString()
    given_names?: string;

    @IsOptional()
    @IsString()
    surname?: string;

}