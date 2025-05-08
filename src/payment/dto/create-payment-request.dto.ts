import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';

export class CreatePaymentRequestDto {
    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsString()
    @IsEnum(['IDR', 'USD']) 
    currency: string;

    @IsOptional()
    @IsString()
    external_id?: string; 

    @IsOptional()
    @IsUrl()
    success_redirect_url?: string;

    @IsOptional()
    @IsUrl()
    failure_redirect_url?: string; 

    @IsOptional()
    @IsString()
    description?: string; 

    @IsOptional()
    @IsString()
    customer_id?: string; 

    @IsOptional()
    @IsEnum(['BANK_TRANSFER', 'CREDIT_CARD', 'EWALLET', 'RETAIL_OUTLET', 'DIRECT_DEBIT']) 
    payment_method_categories?: string[]; 

    @IsOptional()
    @IsString({ each: true }) 
    payment_methods?: string[]; 

    @IsOptional()
    @IsNumber()
    invoice_duration?: number; 
}