import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateRefundDto {
    @IsNotEmpty()
    @IsString()
    paymentId: string; // Payment ID yang akan di-refund (dari parameter endpoint)

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsString()
    reason: string; // Alasan Refund (wajib diisi)

    @IsOptional()
    @IsString()
    external_id?: string; // Tambahkan external_id (opsional)


    // ... tambahkan validasi lain sesuai kebutuhan payload Refund Xendit ...
}