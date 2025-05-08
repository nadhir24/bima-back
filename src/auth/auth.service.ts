import { Injectable, HttpException, HttpStatus, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
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
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
        include: { userPassword: true, userRoles: { include: { role: true } } },
      });

      if (!user) {
        this.logger.warn(`User not found for email: ${loginDto.email}`);
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.userPassword) {
        this.logger.error(
          `User ${loginDto.email} does not have a password record.`,
        );
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      const isValid = await bcrypt.compare(
        loginDto.password,
        user.userPassword.passwordHash,
      );

      if (!isValid) {
        this.logger.warn(`Invalid password for user: ${loginDto.email}`);
        throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
      }

      const roles = user.userRoles.map((userRole) => userRole.role.name);
      this.logger.log(`User ${user.email} roles: ${roles.join(', ')}`);

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
        expiresIn: '6h', // Diubah ke 6 jam
      });

      this.logger.log(
        `Login successful for user: ${user.email}, token generated.`,
      );
      return {
        statusCode: HttpStatus.OK,
        token: token,
        loginData: payload, // Mengembalikan payload yang sama dengan yang ada di token
      };
    } catch (e) {
      this.logger.error(
        `Login error for ${loginDto.email}: ${e.message}`,
        e.stack,
      );
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyTokenRole(userId: number, token: string) {
    this.logger.log(`Verifying token role for user ID: ${userId}`);
    try {
      const decodedToken = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
      });
      this.logger.log(
        `Token decoded for user ID ${userId}: ${JSON.stringify(decodedToken)}`,
      );

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });

      if (!currentUser) {
        this.logger.warn(
          `User not found during token role verification: ${userId}`,
        );
        throw new UnauthorizedException('User not found');
      }

      const currentRoles = currentUser.userRoles.map((ur) => ur.role.name);
      const tokenRoles = decodedToken.roles || [];

      const rolesMatch =
        currentRoles.length === tokenRoles.length &&
        currentRoles.every((role) => tokenRoles.includes(role));

      if (!rolesMatch) {
        this.logger.log(
          `Role change detected for user ID ${userId}. Current: ${currentRoles.join(',')}, Token: ${tokenRoles.join(',')}. Generating new token.`,
        );
        const newPayload = {
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          phoneNumber: currentUser.phoneNumber,
          roles: currentRoles, // Gunakan roles terbaru dari database
          photoProfile: currentUser.photoProfile,
        };

        const newToken = this.jwtService.sign(newPayload, {
          secret: this.configService.get<string>('JWT_SECRET_KEY'),
          expiresIn: '6h', // Diubah ke 6 jam
        });

        return {
          valid: true,
          roleChanged: true,
          message: 'Role has been updated, new token generated',
          token: newToken,
          userData: newPayload,
        };
      }

      this.logger.log(
        `Token role verified and matches current role for user ID ${userId}`,
      );
      return {
        valid: true,
        roleChanged: false,
        message: 'Token role verified and matches current role',
        userData: decodedToken, // Kembalikan decoded token jika role tidak berubah
      };
    } catch (error) {
      this.logger.error(
        `Error verifying token role for user ID ${userId}: ${error.message}`,
        error.stack,
      );
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
    this.logger.log('Attempting to extract and verify token.');
    try {
      let decodedToken;
      try {
        decodedToken = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET_KEY'),
        });
      } catch (e) {
        this.logger.warn(
          `Token verification failed (jwtService.verify): ${e.message}`,
        );
        throw new UnauthorizedException('Invalid or expired token');
      }

      const userId = decodedToken.id;
      if (!userId) {
        this.logger.warn('No user ID found in decoded token.');
        throw new BadRequestException('No user ID in token');
      }
      this.logger.log(`User ID ${userId} extracted from token.`);
      return this.verifyTokenRole(userId, token); // Panggil verifyTokenRole yang sudah ada
    } catch (error) {
      this.logger.error(
        `Error in extractAndVerifyToken: ${error.message}`,
        error.stack,
      );
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
      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
