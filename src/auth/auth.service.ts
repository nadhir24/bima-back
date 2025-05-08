import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './auth/dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
        include: { userPassword: true, userRoles: { include: { role: true } } },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.userPassword) {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      const isValid = await bcrypt.compare(
        loginDto.password,
        user.userPassword.passwordHash,
      );

      if (!isValid) {
        throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
      }

      const roles = user.userRoles.map((userRole) => userRole.role.name);

      const payload = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roles: roles,
        photoProfile: user.photoProfile,
      };

      const token = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
        expiresIn: '6h',
      });

      return {
        statusCode: HttpStatus.OK,
        token: token,
        loginData: payload,
      };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyTokenRole(userId: number, token: string) {
    try {
      const decodedToken = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
      });

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });

      if (!currentUser) {
        throw new UnauthorizedException('User not found');
      }

      const currentRoles = currentUser.userRoles.map((ur) => ur.role.name);
      const tokenRoles = decodedToken.roles || [];

      const rolesMatch =
        currentRoles.length === tokenRoles.length &&
        currentRoles.every((role) => tokenRoles.includes(role));

      if (!rolesMatch) {
        const newPayload = {
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          phoneNumber: currentUser.phoneNumber,
          roles: currentRoles,
          photoProfile: currentUser.photoProfile,
        };

        const newToken = this.jwtService.sign(newPayload, {
          secret: this.configService.get<string>('JWT_SECRET_KEY'),
          expiresIn: '6h',
        });

        return {
          valid: true,
          roleChanged: true,
          message: 'Role has been updated, new token generated',
          token: newToken,
          userData: newPayload,
        };
      }

      return {
        valid: true,
        roleChanged: false,
        message: 'Token role verified and matches current role',
        userData: decodedToken,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error verifying token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async extractAndVerifyToken(token: string) {
    try {
      let decodedToken;
      try {
        decodedToken = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET_KEY'),
        });
      } catch (e) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const userId = decodedToken.id;
      if (!userId) {
        throw new BadRequestException('No user ID in token');
      }
      return this.verifyTokenRole(userId, token);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error processing token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyJwtToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
      });
    } catch (error) {
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
