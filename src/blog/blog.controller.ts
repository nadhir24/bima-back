import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Prisma, Blog } from '@prisma/client';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  async create(@Body() data: Prisma.BlogCreateInput): Promise<Blog> {
    return this.blogService.create(data);
  }

  @Get()
  async findAll(): Promise<Blog[]> {
    return this.blogService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Blog> {
    return this.blogService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.BlogUpdateInput): Promise<Blog> {
    return this.blogService.update(+id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Blog> {
    return this.blogService.remove(+id);
  }
}
