import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async getUsers() {
    return await this.prisma.user.findMany({
      include: {
        userRoles: true, // Jika Anda ingin menyertakan relasi seperti roles
      },
    });
  }
  
  async getUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
  async signUp(createUserDto: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(createUserDto.password, salt);

    const defaultRoleId = 1; // ID peran default

    return this.prisma.user.create({
      data: {
        fullName: createUserDto.fullName,
        email: createUserDto.email,
        phoneNumber: createUserDto.phoneNumber,
        password: passHash, // Include the password field here
        userPassword: {
          create: {
            passwordHash: passHash,
          },
        },
        userRoles: {
          create: {
            roleId: defaultRoleId,
          },
        },
      },
    });
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    const {
      fullName,
      phoneNumber,
      email,
      uspro_gender,
      uspro_birt_date,
      roleID,
      photoProfile,
    } = updateUserDto;

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    try {
      const updateUser = await this.prisma.user.update({
        where: { id },
        data: {
          fullName,
          phoneNumber,
          email,
          userProfile: {
            update: {
              gender: uspro_gender,
              // birthDate: uspro_birt_date,
            },
          },
          userRoles: {
            update: {
              where: {
                userId_roleId: {
                  userId: id,
                  roleId: roleID,
                },
              },
              data: {
                roleId: roleID,
              },
            },
          },
          photoProfile,
        },
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'User updated successfully',
        data: updateUser,
      };
    } catch (error) {
      throw new HttpException('Failed to update user', HttpStatus.BAD_REQUEST);
    }
  }
}
