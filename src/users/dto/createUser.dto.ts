import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Nama lengkap harus diisi' })
  fullName: string;
  roleID: number;
  @IsEmail({}, { message: 'Email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString({ message: 'Password harus berupa string' })
  @Length(8, 100)
  password: string;

  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  @Matches(/^\+62\d{9,14}$/, {
    message: 'Nomor telepon harus valid dan sesuai format Indonesia',
  })
  phoneNumber: string;
  @IsNotEmpty()
  confirm_password: string;
}
