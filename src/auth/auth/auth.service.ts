import { Injectable, UnauthorizedException, HttpStatus } from '@nestjs/common';
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
  
  async loginUser(loginDto: LoginDto) {
    try {
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
  
      const token = sign(
        {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          roleId: user.userRoles,
          photoProfile: user.photoProfile,
        },
        process.env.SECRET_KEY,
      );
  
      return { statusCode: HttpStatus.OK, token: token, loginData: loginData };
    } catch (e) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: e.message };
    }
  }
  
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userPassword: true },
    });
  
    if (user && await bcrypt.compare(pass, user.userPassword.passwordHash)) {
      const { passwordHash, ...result } = user.userPassword;
      return { ...user, ...result };
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
