import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('user-role')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get()
  async getAllRoles() {
    return this.userRoleService.getAllRoles();
  }

  @Post()
  async createRole(@Body() createRoleDto: CreateUserRoleDto) {
    return this.userRoleService.createRole(createRoleDto);
  }

  @Delete(':id')
  async deleteRole(@Param('id') id: string) {
    return this.userRoleService.deleteRole(id);
  }
  @Put('update')
  async updateRole(@Body() body: { userId: number; newRoleId: number }) {
    return this.userRoleService.updateUserRole(body.userId, body.newRoleId);
  }
}
