import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListPayoutsDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    @IsEnum(['IDR', 'USD']) 
    currency?: string;

    @IsOptional()
    @IsString()
    external_id?: string;

    @IsOptional()
    @IsString()
    bank_code?: string;

    @IsOptional()
    @IsString()
    account_holder_name?: string;

    @IsOptional()
    @IsString()
    created_gte?: string; 

    @IsOptional()
    @IsString()
    created_lte?: string; 


}