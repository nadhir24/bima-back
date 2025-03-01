import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListInvoicesDto {
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
    payer_email?: string; // Tambahkan filter payer_email

    @IsOptional()
    @IsString()
    description?: string; // Tambahkan filter description

    @IsOptional()
    @IsString()
    client_id?: string; // Tambahkan filter client_id

    @IsOptional()
    @IsString()
    payment_method?: string; // Tambahkan payment_method sebagai query param

    @IsOptional()
    @IsString()
    created_gte?: string; // Tambahkan filter tanggal created (>=)

    @IsOptional()
    @IsString()
    created_lte?: string; // Tambahkan filter tanggal created (<=)

    // ... tambahkan query params lain sesuai kebutuhan API Xendit ...
}