import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpStatus,
  HttpCode
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
    console.log('Signup request received:', createUserDto);
    try {
      const result = await this.authService.signup(createUserDto);
      console.log('Signup successful:', result);
      return result;
    } catch (error) {
      console.error('Signup error in controller:', error);
      throw error; // Re-throw the error to be handled by global filters
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
    console.log('Verifying token for user:', req.user?.id);
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Authorization header missing or invalid format'
      };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Call verifyTokenRole dengan user ID dari token dan token itu sendiri
    return this.authService.verifyTokenRole(req.user.id, token);
  }

  @Post('verify')
  async verifyTokenRole(@Body() body: { userId: number }, @Req() req: any) {
    console.log('Verify token role for user', body.userId);
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Authorization header missing or invalid format'
      };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return this.authService.verifyTokenRole(body.userId, token);
  }
  
  @Get('verify-token')
  async verifyTokenWithQuery(@Req() req) {
    console.log('Verify token from query params');
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Authorization header missing or invalid format'
      };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Call the auth service to verify and extract user ID from token
    return this.authService.extractAndVerifyToken(token);
  }
}
