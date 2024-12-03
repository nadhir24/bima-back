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
    return this.prisma.role.findMany(); // Ambil semua role dari database
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
