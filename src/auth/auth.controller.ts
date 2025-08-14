import { Controller, Get, Post, Req, Res, HttpCode, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthTokenController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          return reject(
            new InternalServerErrorException('Could not log out.'),
          );
        }
        res.clearCookie('connect.sid'); // Default session cookie name
        resolve({ message: 'Logged out successfully' });
      });
    });
  }

  /**
   * Simple endpoint to check if token is valid.
   * This doesn't verify role changes, just token validity.
   */
  @Get('token-check')
  async checkToken(@Req() req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'Authorization header missing or invalid format',
      };
    }

    const token = authHeader.substring(7);

    try {
      const decodedToken = await this.authService.verifyJwtToken(token);

      const userId = decodedToken.id || decodedToken.sub;

      if (!userId) {
        return {
          valid: false,
          message: 'Invalid token: missing user ID',
        };
      }

      return {
        valid: true,
        userId: userId,
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Invalid token',
      };
    }
  }
}
