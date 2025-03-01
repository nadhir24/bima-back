import { IsString, IsOptional } from 'class-validator';

export class ListCustomersDto {
    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    phone_number?: string;

}