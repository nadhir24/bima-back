import { Injectable } from '@nestjs/common';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserRoleService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    // private mailService: MailService,
  ) {}

  async getAllRoles() {
    const roles = await this.prisma.role.findMany(); // Fetch all roles
    const roleMap = {};
    roles.forEach((role) => {
      roleMap[role.id] = role.name; // Create a mapping of roleId to role name
    });
    return roleMap; // Return the mapping
  }
  async createRole(createRoleDto: CreateUserRoleDto) {
    return this.prisma.role.create({
      data: createRoleDto,
    });
  }
  async deleteRole(id: string) {
    return this.prisma.role.delete({
      where: { id: Number(id) },
    });
  }
  findOne(id: number) {
    return `This action returns a #${id} userRole`;
  }

  update(id: number, updateUserRoleDto: UpdateUserRoleDto) {
    return `This action updates a #${id} userRole`;
  }

  async updateUserRole(userId: number, newRoleId: number) {
    try {
      // Pastikan userId dan newRoleId adalah angka
      const numericUserId = Number(userId);
      const numericRoleId = Number(newRoleId);

      // Validasi tambahan jika konversi gagal
      if (isNaN(numericUserId) || isNaN(numericRoleId)) {
        console.error(
          `Invalid conversion: userId=${userId}, newRoleId=${newRoleId}`,
        );
        throw new Error('User ID and Role ID must be valid numbers.');
      }

      console.log(
        `Updating user role for userId: ${numericUserId} to roleId: ${numericRoleId}`,
      );

      const updatedRole = await this.prisma.userRole.updateMany({
        where: {
          userId: numericUserId, // Gunakan userId yang sudah pasti angka
        },
        data: {
          roleId: numericRoleId, // Gunakan roleId yang sudah pasti angka
        },
      });

      // Check if any record was actually updated
      if (updatedRole.count === 0) {
        // Handle the case where the user ID might not exist
        console.warn(
          `No user role found for userId: ${numericUserId} to update.`,
        );
        // return { statusCode: 404, message: 'User not found or role already set' }; // Opsional: Kembalikan 404
      }

      // Mendapatkan data user terbaru setelah update role
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: numericUserId },
        include: {
          userRoles: true,
          userProfile: {
            include: {
              addresses: true,
            },
          },
        },
      });

      if (!updatedUser) {
        throw new Error('User not found after role update');
      }

      // Generate token baru dengan data role terbaru
      const token = this.jwtService.sign(
        {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          roleId: updatedUser.userRoles,
          photoProfile: updatedUser.photoProfile,
          userProfile: updatedUser.userProfile,
        },
        { secret: process.env.JWT_SECRET_KEY, expiresIn: '6h' },
      );

      console.log('Generated new token with updated role');

      return {
        statusCode: 200,
        message: 'Role berhasil diperbarui',
        updatedCount: updatedRole.count,
        token: token, // Token baru dengan informasi role terbaru
        userData: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          roleId: updatedUser.userRoles,
          photoProfile: updatedUser.photoProfile,
          userProfile: updatedUser.userProfile,
        },
      };
    } catch (error: any) {
      console.error('Error updating user role:', error); // Log error detail
      return {
        statusCode: 500,
        message: 'Terjadi kesalahan saat memperbarui role',
        error: error.message,
      };
    }
  }
}
