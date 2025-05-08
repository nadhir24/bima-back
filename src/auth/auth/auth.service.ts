import {
  Injectable,
  UnauthorizedException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { sign } from 'jsonwebtoken';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // Method for user signup
  async signup(createUserDto: CreateUserDto): Promise<User> {
    try {
      const newUser = await this.usersService.signUp(createUserDto);
      return newUser;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; 
      }
      throw new HttpException(
        'Failed to create user during signup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async login(loginDto: LoginDto) {
    try {
   
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
        include: { userPassword: true, userRoles: true },
      });

      if (!user) {
        return { statusCode: HttpStatus.NOT_FOUND, message: 'User not found' };
      }

      const isValid = await bcrypt.compare(
        loginDto.password,
        user.userPassword.passwordHash,
      );

      if (!isValid) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid password',
        };
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
        { secret: process.env.JWT_SECRET_KEY, expiresIn: '6h' },
      );

      return { statusCode: HttpStatus.OK, token: token, loginData: loginData };
    } catch (e) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: e.message };
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    if (!email || !pass) {
      throw new UnauthorizedException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userPassword: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      pass,
      user.userPassword.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const { passwordHash, ...result } = user.userPassword;
    return { ...user, ...result };
  }

  async verifyTokenRole(userId: number, token: string) {
    if (!userId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'User ID not provided',
        valid: false,
      };
    }

    try {
      let decodedToken;
      try {
        decodedToken = this.jwtService.verify(token);
      } catch (e) {
        return {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid token',
          valid: false,
        };
      }

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: true,
          userProfile: {
            include: {
              addresses: true,
            },
          },
        },
      });

      if (!currentUser) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
          valid: false,
        };
      }

      const tokenRoleId = decodedToken.roleId?.[0]?.roleId;
      const dbRoleId = currentUser.userRoles?.[0]?.roleId;

      const roleChanged = tokenRoleId !== dbRoleId;
      if (roleChanged) {
        const payload = {
          userId: currentUser.id,
          email: currentUser.email,
          roleId: currentUser.userRoles,
        };

        const newToken = this.jwtService.sign(payload, {
          secret: process.env.JWT_SECRET_KEY,
          expiresIn: '6h', 
        });

        const userData = {
          id: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.fullName,
          phoneNumber: currentUser.phoneNumber,
          photoProfile: currentUser.photoProfile,
          roleId: currentUser.userRoles,
          userProfile: currentUser.userProfile,
        };

        return {
          valid: true,
          roleChanged: true,
          message: 'Role has been updated, new token generated',
          token: newToken,
          userData,
        };
      }

      return {
        valid: true,
        roleChanged: false,
        message: 'Token role verified and matches current role',
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error verifying token',
        valid: false,
        error: error.message,
      };
    }
  }

  async extractAndVerifyToken(token: string) {
    try {
      let decodedToken;
      try {
        decodedToken = this.jwtService.verify(token);
      } catch (e) {
        return {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid token',
          valid: false,
        };
      }

      const userId = decodedToken.id || decodedToken.sub;
      if (!userId) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'No user ID in token',
          valid: false,
        };
      }

      return this.verifyTokenRole(userId, token);
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error verifying token',
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * @param token 
   * @returns
   */
  async verifyJwtToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
