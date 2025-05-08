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
    console.log('Signup service called with DTO:', createUserDto);
    // Here we can add more logic if needed, like checking for existing email/phone before calling UsersService
    // For now, we directly call the createUser method from UsersService
    try {
      const newUser = await this.usersService.signUp(createUserDto);
      console.log('User created successfully in signup service:', newUser);
      // Optionally, you could automatically log in the user after signup and return a token
      // For simplicity, we just return the created user data
      return newUser;
    } catch (error) {
      console.error('Error during user creation in signup service:', error);
      // Handle specific errors if needed (e.g., unique constraint violation)
      if (error instanceof HttpException) {
        throw error; // Re-throw if it's already an HttpException (e.g., from UsersService)
      }
      // Throw a generic error for other cases
      throw new HttpException(
        'Failed to create user during signup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Menggunakan satu metode login saja
  async login(loginDto: LoginDto) {
    try {
      // Cek apakah nomor telepon sudah terdaftar
      // const existingnumber = await this.prisma.user.findUnique({
      //   where: { phoneNumber: loginDto.phoneNumber },
      // });

      // if (existingUser) {
      //   throw new HttpException(
      //     'Phone number already in use',
      //     HttpStatus.BAD_REQUEST,
      //   );
      // }

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
        { secret: process.env.JWT_SECRET_KEY, expiresIn: '6h' }, // Diubah ke 6 jam
      );

      return { statusCode: HttpStatus.OK, token: token, loginData: loginData };
    } catch (e) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: e.message };
    }
  }

  // Validasi user untuk autentikasi JWT
  async validateUser(email: string, pass: string): Promise<any> {
    // Validasi email dan password tidak kosong
    if (!email || !pass) {
      throw new UnauthorizedException('Email and password are required');
    }

    // Cari user berdasarkan email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userPassword: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Cek apakah password cocok
    const isPasswordValid = await bcrypt.compare(
      pass,
      user.userPassword.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Hapus password hash dari hasil yang dikembalikan
    const { passwordHash, ...result } = user.userPassword;
    return { ...user, ...result };
  }

  // New method to verify token role against database
  async verifyTokenRole(userId: number, token: string) {
    console.log('Verifying token role for user:', userId);

    if (!userId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'User ID not provided',
        valid: false,
      };
    }

    try {
      // Decode the token to get current role info
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

      // Get the current user with their role from the database
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

      // Check if the role in the token matches the current role in the database
      const tokenRoleId = decodedToken.roleId?.[0]?.roleId;
      const dbRoleId = currentUser.userRoles?.[0]?.roleId;

      console.log('Token role ID:', tokenRoleId);
      console.log('DB role ID:', dbRoleId);

      const roleChanged = tokenRoleId !== dbRoleId;
      if (roleChanged) {
        console.log('Role has changed, generating new token');

        // Create new payload with updated role
        const payload = {
          userId: currentUser.id,
          email: currentUser.email,
          roleId: currentUser.userRoles,
        };

        // Generate new token
        const newToken = this.jwtService.sign(payload, {
          secret: process.env.JWT_SECRET_KEY,
          expiresIn: '6h', // Diubah ke 6 jam
        });

        // Prepare user data for response
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

      // Role matches, token is valid
      return {
        valid: true,
        roleChanged: false,
        message: 'Token role verified and matches current role',
      };
    } catch (error) {
      console.error('Error verifying token role:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error verifying token',
        valid: false,
        error: error.message,
      };
    }
  }

  // Extract userId from token and then verify the token
  async extractAndVerifyToken(token: string) {
    try {
      // Decode the token to get current role info
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

      // Extract user ID from token, supporting both 'id' and 'sub' fields
      const userId = decodedToken.id || decodedToken.sub;
      if (!userId) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'No user ID in token',
          valid: false,
        };
      }

      console.log('Extracted userId from token:', userId);

      // Use the extracted userId to verify the token
      return this.verifyTokenRole(userId, token);
    } catch (error) {
      console.error('Error extracting and verifying token:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error verifying token',
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Public helper method to verify a JWT token
   * @param token JWT token string
   * @returns Decoded token payload
   */
  async verifyJwtToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
