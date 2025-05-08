import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListInvoicesDto {
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
    payer_email?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    client_id?: string;

    @IsOptional()
    @IsString()
    payment_method?: string;

    @IsOptional()
    @IsString()
    created_gte?: string;

    @IsOptional()
    @IsString()
    created_lte?: string;

}