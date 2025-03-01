import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';

export class CreatePaymentRequestDto {
    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsString()
    @IsEnum(['IDR', 'USD']) // Validasi enum untuk currency, tambahkan mata uang lain jika perlu
    currency: string;

    @IsOptional()
    @IsString()
    external_id?: string; // Tambahkan external_id

    @IsOptional()
    @IsUrl()
    success_redirect_url?: string; // Tambahkan success_redirect_url, validasi URL

    @IsOptional()
    @IsUrl()
    failure_redirect_url?: string; // Tambahkan failure_redirect_url, validasi URL

    @IsOptional()
    @IsString()
    description?: string; // Tambahkan description

    @IsOptional()
    @IsString()
    customer_id?: string; // Tambahkan customer_id

    @IsOptional()
    @IsEnum(['BANK_TRANSFER', 'CREDIT_CARD', 'EWALLET', 'RETAIL_OUTLET', 'DIRECT_DEBIT']) // Contoh enum kategori metode pembayaran
    payment_method_categories?: string[]; // Tambahkan payment_method_categories (gunakan string array untuk enum)

    @IsOptional()
    @IsString({ each: true }) // Validasi setiap item dalam array harus string
    payment_methods?: string[]; // Tambahkan payment_methods (gunakan string array)

    @IsOptional()
    @IsNumber()
    invoice_duration?: number; // Tambahkan invoice_duration

    // ... tambahkan validasi lain sesuai kebutuhan payload Payment Request Xendit ...
}