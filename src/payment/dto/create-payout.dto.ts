import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsEmail, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayoutBankDto {
    @IsNotEmpty()
    @IsString()
    bank_code: string;

    @IsNotEmpty()
    @IsString()
    account_holder_name: string;

    @IsNotEmpty()
    @IsString()
    account_number: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    phone_number?: string;

    @IsOptional()
    @IsString()
    swift_code?: string;

    @IsOptional()
    @IsString()
    account_validation_reference?: string;
}


export class CreatePayoutDto {
    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsString()
    @IsEnum(['IDR', 'USD'])
    currency: string;

    @IsNotEmpty()
    @IsString()
    external_id: string;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => CreatePayoutBankDto) 
    bank_account: CreatePayoutBankDto;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone_number?: string;
}