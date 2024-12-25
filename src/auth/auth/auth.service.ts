import { Injectable, UnauthorizedException, HttpStatus, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { sign } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  
  // Menggunakan satu metode login saja
  async login(loginDto: LoginDto) {
    try {
        // Cek apakah nomor telepon sudah terdaftar
  // const existingnumber = await this.prisma.user.findUnique({
  //   where: { phoneNumber: loginDto.phoneNumber },
  // });

  // if (existingUser) {
  //   throw new HttpException(
  //     'Phone number already in use',
  //     HttpStatus.BAD_REQUEST,
  //   );
  // }

      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
        include: { userPassword: true, userRoles: true },
      });
  
      if (!user) {
        return { statusCode: HttpStatus.NOT_FOUND, message: 'User not found' };
      }
  
      const isValid = await bcrypt.compare(loginDto.password, user.userPassword.passwordHash);
  
      if (!isValid) {
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid password' };
      }
  
      const loginData = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roleId: user.userRoles,
        photoProfile: user.photoProfile,
      };
  
      const token = this.jwtService.sign(
        {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          roleId: user.userRoles,
          photoProfile: user.photoProfile,
        },
        { secret: process.env.SECRET_KEY, expiresIn: '1h' }, // Expire token 1 jam
      );
  
      return { statusCode: HttpStatus.OK, token: token, loginData: loginData };
    } catch (e) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: e.message };
    }
  }
  
  // Validasi user untuk autentikasi JWT
  async validateUser(email: string, pass: string): Promise<any> {
    // Validasi email dan password tidak kosong
    if (!email || !pass) {
      throw new UnauthorizedException('Email and password are required');
    }
  
    // Cari user berdasarkan email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userPassword: true },
    });
  
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
  
    // Cek apakah password cocok
    const isPasswordValid = await bcrypt.compare(pass, user.userPassword.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }
  
    // Hapus password hash dari hasil yang dikembalikan
    const { passwordHash, ...result } = user.userPassword;
    return { ...user, ...result };
  }
  
}
