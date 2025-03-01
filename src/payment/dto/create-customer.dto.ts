import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateCustomerDto {
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