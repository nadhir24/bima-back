import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListTransactionsDto {
    @IsOptional()
    @IsString()
    payment_method?: string;

    @IsOptional()
    @IsString()
    @IsEnum(['IDR', 'USD']) // Validasi enum currency, sesuaikan daftar mata uang yang didukung
    currency?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    reference_id?: string; // Tambahkan filter reference_id (external_id atau invoice_id dll)

    @IsOptional()
    @IsString()
    created_gte?: string; // Tambahkan filter tanggal created (>=)

    @IsOptional()
    @IsString()
    created_lte?: string; // Tambahkan filter tanggal created (<=)


}