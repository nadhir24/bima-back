import { IsEmail, IsNotEmpty, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Nama lengkap harus berupa string' })
  @IsNotEmpty({ message: 'Nama lengkap harus diisi' })
  fullName: string;

  @IsEmail({}, { message: 'Email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString({ message: 'Password harus berupa string' })
  @Length(8, 100, { message: 'Password harus memiliki panjang minimal 8 karakter' })
  password: string;

  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  @Matches(/^\+62\d{9,14}$/, {
    message: 'Nomor telepon harus valid dan sesuai format Indonesia',
  })
  phoneNumber: string;
}
