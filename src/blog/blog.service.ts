import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Blog } from '@prisma/client';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.BlogCreateInput): Promise<Blog> {
    return this.prisma.blog.create({
      data,
    });
  }

  async findAll(): Promise<Blog[]> {
    return this.prisma.blog.findMany();
  }

  async findOne(id: number): Promise<Blog> {
    return this.prisma.blog.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.BlogUpdateInput): Promise<Blog> {
    return this.prisma.blog.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<Blog> {
    return this.prisma.blog.delete({
      where: { id },
    });
  }
}
