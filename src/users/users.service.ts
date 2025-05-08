import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { User, Address } from '@prisma/client';
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
        userRoles: true,
      },
    });
  }

  async getUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userProfile: {
          include: {
            addresses: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
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

    const defaultRoleId = 3; 

    return this.prisma.user.create({
      data: {
        fullName: createUserDto.fullName,
        email: createUserDto.email,
        phoneNumber: createUserDto.phoneNumber,
        password: passHash, 
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userProfile: { include: { addresses: true } } },
    });

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
      address_province,
      address_postalCode,
      address_country,
    } = updateUserDto;

    try {
      const updateData: any = {
        fullName,
        phoneNumber,
        email,
        photoProfile,
      };

      if (
        uspro_gender ||
        uspro_birth_date ||
        address_street ||
        address_city ||
        address_province ||
        address_postalCode ||
        address_country
      ) {
        const userProfileUpdate: any = {
          gender: uspro_gender,
          birthDate: uspro_birth_date ? new Date(uspro_birth_date) : undefined,
        };

        const addressData = {
          street: address_street,
          city: address_city,
          state: address_province,
          postalCode: address_postalCode,
          country: address_country,
        };

        const hasAddressData = Object.values(addressData).some(
          (val) => val !== undefined && val !== null && val !== '',
        );

        if (hasAddressData) {
          const existingAddresses = user.userProfile?.addresses || [];
          if (existingAddresses.length > 0) {
            userProfileUpdate.addresses = {
              update: {
                where: { id: existingAddresses[0].id },
                data: addressData,
              },
            };
          } else {
            userProfileUpdate.addresses = {
              create: addressData,
            };
          }
        }

        if (uspro_gender || uspro_birth_date || hasAddressData) {
          updateData.userProfile = {
            upsert: {
              create: {
                ...userProfileUpdate,
                ...(hasAddressData &&
                  !userProfileUpdate.addresses?.update && {
                    addresses: { create: addressData },
                  }),
              },
              update: userProfileUpdate,
            },
          };
        }
      }

      if (roleID) {
        const currentRole = await this.prisma.userRole.findFirst({
          where: { userId: id },
        });

        if (currentRole) {
          updateData.userRoles = {
            update: {
              where: {
                userId_roleId: {
                  userId: id,
                  roleId: currentRole.roleId,
                },
              },
              data: {
                roleId: roleID,
              },
            },
          };
        } else {
          updateData.userRoles = {
            create: {
              roleId: roleID,
            },
          };
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        const field = error.meta?.target[0];
        throw new HttpException(
          `${field} already in use`,
          HttpStatus.BAD_REQUEST,
        );
      }
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
      await this.prisma.userPassword.deleteMany({
        where: { userId: id },
      });

      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      await this.prisma.user.delete({
        where: { id },
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'User deleted successfully',
      };
    } catch (error) {
      throw new HttpException('Failed to delete user', HttpStatus.BAD_REQUEST);
    }
  }

  async getUsersWithRoles(page = 1, limit = 10, search = '') {
    try {
      let where = {};
      if (search && search.trim() !== '') {
        where = {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        };
      }

      const skip = (page - 1) * limit;

      const [users, totalCount] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      const usersWithRoles = users.map((user: any) => {
        const roleInfo = user.userRoles[0]?.role || null;
        return {
          ...user,
          roleName: roleInfo ? roleInfo.name : 'No Role',
          roleId: user.userRoles[0]?.roleId,
        };
      });

      return {
        users: usersWithRoles,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          itemsPerPage: limit,
          hasNextPage: skip + users.length < totalCount,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      throw new Error('Failed to fetch users with roles');
    }
  }

 
  async getUserAddresses(userId: number): Promise<Address[] | null> {
    const userWithProfile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userProfile: {
          include: {
            addresses: true,
          },
        },
      },
    });

    if (!userWithProfile?.userProfile?.addresses) {
      return null;
    }

    return userWithProfile.userProfile.addresses;
  }

  async addOrUpdateUserAddress(
    userId: number,
    addressDto: {
      label?: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    try {
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!userProfile) {
        const newUserProfile = await this.prisma.userProfile.create({
          data: {
            userId,
          },
        });

        const address = await this.prisma.address.create({
          data: {
            label: addressDto.label || 'Rumah',
            street: addressDto.street,
            city: addressDto.city,
            state: addressDto.state,
            postalCode: addressDto.postalCode || '12345', 
            country: addressDto.country || 'Indonesia',
            isDefault: addressDto.isDefault || false,
            userProfileId: newUserProfile.id,
          },
        });

        return {
          success: true,
          message: 'Address added successfully',
          data: address,
        };
      }

      if (addressDto.isDefault) {
        await this.prisma.address.updateMany({
          where: {
            userProfileId: userProfile.id,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const address = await this.prisma.address.create({
        data: {
          label: addressDto.label || 'Rumah',
          street: addressDto.street,
          city: addressDto.city,
          state: addressDto.state,
          postalCode: addressDto.postalCode || '12345', 
          country: addressDto.country || 'Indonesia',
          isDefault: addressDto.isDefault || false,
          userProfileId: userProfile.id,
        },
      });

      return {
        success: true,
        message: 'Address added successfully',
        data: address,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add/update address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
