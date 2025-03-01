import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListRefundsDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    payment_id?: string; // Tambahkan filter payment_id

    @IsOptional()
    @IsString()
    external_id?: string; // Tambahkan filter external_id

    @IsOptional()
    @IsString()
    created_gte?: string; // Tambahkan filter tanggal created (>=)

    @IsOptional()
    @IsString()
    created_lte?: string; // Tambahkan filter tanggal created (<=)


}