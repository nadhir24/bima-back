import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListPayoutsDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    @IsEnum(['IDR', 'USD']) // Validasi enum currency, sesuaikan daftar mata uang yang didukung
    currency?: string;

    @IsOptional()
    @IsString()
    external_id?: string;

    @IsOptional()
    @IsString()
    bank_code?: string; // Tambahkan filter bank_code

    @IsOptional()
    @IsString()
    account_holder_name?: string; // Tambahkan filter account_holder_name

    @IsOptional()
    @IsString()
    created_gte?: string; // Tambahkan filter tanggal created (>=)

    @IsOptional()
    @IsString()
    created_lte?: string; // Tambahkan filter tanggal created (<=)


    // ... tambahkan query params lain sesuai kebutuhan API Xendit ...
}