import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListPaymentRequestsDto {
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
    customer_id?: string; 

    @IsOptional()
    @IsString()
    payment_method?: string; 

    @IsOptional()
    @IsString()
    payment_method_category?: string; 
    @IsOptional()
    @IsString()
    created_gte?: string; 

    @IsOptional()
    @IsString()
    created_lte?: string; 

}