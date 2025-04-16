import { Injectable } from '@nestjs/common';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserRoleService {
  constructor(
    private prisma: PrismaService,
    // private mailService: MailService,
  ) {}

  async getAllRoles() {
    const roles = await this.prisma.role.findMany(); // Fetch all roles
    const roleMap = {};
    roles.forEach(role => {
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

  async  updateUserRole(userId: number, newRoleId: number) {
    try {
      const updatedRole = await this.prisma.userRole.updateMany({
        where: {
          userId: userId, // Cari user dengan ID tertentu
        },
        data: {
          roleId: newRoleId, // Perbarui roleId menjadi yang baru
        },
      });
  
      return {
        statusCode: 200,
        message: 'Role berhasil diperbarui',
        updatedRole,
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: 'Terjadi kesalahan saat memperbarui role',
        error: error.message,
      };
    }
  }
}
