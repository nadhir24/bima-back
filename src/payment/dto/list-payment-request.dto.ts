import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ListPaymentRequestsDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    @IsEnum(['IDR', 'USD']) // Validasi enum currency, sesuaikan daftar mata uang yang didukung
    currency?: string;

    @IsOptional()
    @IsString()
    external_id?: string; // Tambahkan external_id sebagai query param

    @IsOptional()
    @IsString()
    customer_id?: string; // Tambahkan customer_id sebagai query param

    @IsOptional()
    @IsString()
    payment_method?: string; // Tambahkan payment_method sebagai query param

    @IsOptional()
    @IsString()
    payment_method_category?: string; // Tambahkan payment_method_category sebagai query param

    @IsOptional()
    @IsString()
    created_gte?: string; // Tambahkan filter tanggal created (>=)

    @IsOptional()
    @IsString()
    created_lte?: string; // Tambahkan filter tanggal created (<=)

}