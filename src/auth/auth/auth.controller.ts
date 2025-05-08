import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { CreateUserDto } from 'src/users/dto/createUser.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() createUserDto: CreateUserDto) {
    try {
      const result = await this.authService.signup(createUserDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verifyToken(@Req() req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Authorization header missing or invalid format',
      };
    }

    const token = authHeader.substring(7);
    return this.authService.verifyTokenRole(req.user.id, token);
  }

  @Post('verify')
  async verifyTokenRole(@Body() body: { userId: number }, @Req() req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Authorization header missing or invalid format',
      };
    }

    const token = authHeader.substring(7);
    return this.authService.verifyTokenRole(body.userId, token);
  }

  @Get('verify-token')
  async verifyTokenWithQuery(@Req() req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Authorization header missing or invalid format',
      };
    }

    const token = authHeader.substring(7);
    return this.authService.extractAndVerifyToken(token);
  }
}
