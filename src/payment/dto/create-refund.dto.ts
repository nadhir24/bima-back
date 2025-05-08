import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateRefundDto {
    @IsNotEmpty()
    @IsString()
    paymentId: string;
    
    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsString()
    reason: string; 

    @IsOptional()
    @IsString()
    external_id?: string;
}