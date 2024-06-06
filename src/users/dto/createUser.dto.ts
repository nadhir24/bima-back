import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateUserDto {
    @IsEmail({}, { message: 'Email tidak valid' })
    email: string;

    @IsNotEmpty({ message: 'Password tidak boleh kosong' })
    @IsString({ message: 'Password harus berupa string' })
    password: string;

    @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
    @Matches(/^\+62\d{9,14}$/, { message: 'Nomor telepon harus valid dan sesuai format Indonesia' })
    phoneNumber: string;
}
