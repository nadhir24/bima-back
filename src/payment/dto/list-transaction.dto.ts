import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListTransactionsDto {
    @IsOptional()
    @IsString()
    payment_method?: string;

    @IsOptional()
    @IsString()
    @IsEnum(['IDR', 'USD'])
    currency?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    reference_id?: string;
    @IsOptional()
    @IsString()
    created_gte?: string;
    @IsOptional()
    @IsString()
    created_lte?: string; 


}