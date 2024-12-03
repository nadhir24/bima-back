import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.seedRoles(); // Panggil fungsi seeding untuk role
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Fungsi untuk melakukan seeding data role
  private async seedRoles() {
    const rolesExist = await this.role.findFirst(); // Cek jika sudah ada role
    if (!rolesExist) {
      await this.role.createMany({
        data: [
          { name: 'admin' }, // Role admin
          { name: 'guest' },  // Role guest
        ],
      });
      console.log('Roles seeded: admin, guest');
    } else {
      console.log('Roles already exist');
    }
  }
}
