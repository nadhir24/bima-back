import {
  Controller,
  Get,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PrismaService } from 'prisma/prisma.service';

@Controller('user-dashboard')
export class UserDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserDashboard(@Req() req) {
    try {
      const userId = req.user.id;

      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: true },
      });

      if (!userWithRoles) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const hasUserRole = userWithRoles.userRoles.some(
        (role) => role.roleId === 2,
      );
      if (!hasUserRole) {
        throw new HttpException(
          'Unauthorized access: User does not have required role',
          HttpStatus.FORBIDDEN,
        );
      }

      return {
        message: 'User dashboard data retrieved successfully',
        userProfile: {
          id: userWithRoles.id,
          fullName: userWithRoles.fullName,
          email: userWithRoles.email,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
