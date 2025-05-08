import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from '../../auth/auth/auth.service';
import { LoginDto } from '../../auth/auth/dto/login.dto';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { JwtMiddleware } from 'src/auth/jwt.middleware';
import { UsersService } from '../users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('signup')
  async signUp(@Body() createUserDto: CreateUserDto) {
    return this.usersService.signUp(createUserDto);
  }

  @UseGuards(JwtMiddleware)  // Guard untuk proteksi endpoint yang membutuhkan autentikasi
  @Post('profile')
  getProfile(@Body() body: any) {
    return { message: 'Authenticated!', data: body };
  }
}