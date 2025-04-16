import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { User } from '@prisma/client';
import { UserRoleService } from './user-role/user-role.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRoleService: UserRoleService,
  ) {}

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
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: createUserDto.phoneNumber },
    });

    if (existingUser) {
      throw new HttpException(
        'Phone number already in use',
        HttpStatus.BAD_REQUEST,
      );
    }
    const existingemail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingemail) {
      throw new HttpException('email already in use', HttpStatus.BAD_REQUEST);
    }
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(createUserDto.password, salt);

    const defaultRoleId = 3; // ID peran default

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
    console.log('Starting updateUser with id:', id);
    console.log('Update DTO:', updateUserDto);

    const user = await this.prisma.user.findUnique({
        where: { id },
        include: { userProfile: true }, // Supaya kita bisa akses addressId
    });
    console.log('Found user:', user);

    if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const {
      fullName,
      phoneNumber,
      email,
      uspro_gender,
      uspro_birth_date,
      roleID,
      photoProfile,
      address_street,
      address_city,
      address_province, // ini untuk "state"
      address_postalCode,
      address_country,
  } = updateUserDto;

    try {
        // Prepare the update data
        const updateData: any = {
            fullName,
            phoneNumber,
            email,
            photoProfile,
        };
        console.log('Initial updateData:', updateData);

        // Only include userProfile if any of the profile fields are provided
        if (uspro_gender || uspro_birth_date || address_street || address_city || address_province) {
            updateData.userProfile = {
                update: {
                    gender: uspro_gender,
                    birthDate: uspro_birth_date ? new Date(uspro_birth_date) : null,
                    address: address_street || address_city || address_province
                        ? {
                              upsert: {
                                  create: {
                                      street: address_street,
                                      city: address_city,
                                      state: address_province, // di Prisma namanya "state"
                                      postalCode: "00000", // sementara default karena tidak ada di DTO
                                      country: "Indonesia", // sementara default karena tidak ada di DTO
                                  },
                                  update: {
                                      street: address_street,
                                      city: address_city,
                                      state: address_province,
                                      postalCode: address_postalCode,
                                      country: address_country,
                                  },
                              },
                          }
                        : undefined,
                },
            };
            console.log('Added userProfile data:', updateData.userProfile);
        }

        if (roleID) {
          console.log('Processing roleID update:', roleID);
          // First find the existing user role
          const currentRole = await this.prisma.userRole.findFirst({
              where: { userId: id }
          });
          console.log('Current role:', currentRole);
          
          if (currentRole) {
              // Update existing role
              updateData.userRoles = {
                  update: {
                      where: {
                          userId_roleId: {
                              userId: id,
                              roleId: currentRole.roleId, // Use the current role ID here
                          },
                      },
                      data: {
                          roleId: roleID, // Set to the new role ID
                      },
                  },
              };
          } else {
              // Create new role relation if none exists
              updateData.userRoles = {
                  create: {
                      roleId: roleID
                  }
              };
          }
          console.log('Updated role data:', updateData.userRoles);
      }

        console.log('Final updateData before update:', updateData);
        const updateUser = await this.prisma.user.update({
            where: { id },
            data: updateData,
        });
        console.log('Update successful:', updateUser);

        return {
            statusCode: HttpStatus.OK,
            message: 'User updated successfully',
            data: updateUser,
        };
    } catch (error) {
        console.error('Error updating user:', error);
        // Check for common Prisma errors like unique constraint violations
        if (error.code === 'P2002') {
            const field = error.meta?.target[0];
            console.error('Unique constraint violation for field:', field);
            throw new HttpException(`${field} already in use`, HttpStatus.BAD_REQUEST);
        }
        // Add other specific error types as needed
        throw new HttpException('Failed to update user', HttpStatus.BAD_REQUEST);
    }
}

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    try {
      // Hapus relasi dari tabel userPassword
      await this.prisma.userPassword.deleteMany({
        where: { userId: id },
      });

      // Hapus relasi dari tabel userRoles
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Hapus user
      await this.prisma.user.delete({
        where: { id },
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting user:', error.message);
      throw new HttpException('Failed to delete user', HttpStatus.BAD_REQUEST);
    }
  }

  async getUsersWithRoles() {
    const users = await this.prisma.user.findMany({
      include: { userRoles: true }, // Include userRoles
    });

    const roleMap = await this.userRoleService.getAllRoles(); // Get role mapping

    return users.map(user => ({
      ...user,
      roleName: user.userRoles.length > 0 ? roleMap[user.userRoles[0].roleId] : null, // Map roleId to role name
    }));
  }
}
