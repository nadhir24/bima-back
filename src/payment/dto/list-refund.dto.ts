import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListRefundsDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    payment_id?: string; 

    @IsOptional()
    @IsString()
    external_id?: string; 

    @IsOptional()
    @IsString()
    created_gte?: string; 

    @IsOptional()
    @IsString()
    created_lte?: string; 


}