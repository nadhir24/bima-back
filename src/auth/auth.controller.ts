import { Controller, Get, Req } from '@nestjs/common';
import { AuthService } from './auth/auth.service';

@Controller('auth')
export class AuthTokenController {
  constructor(private readonly authService: AuthService) {}

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
