import {
  Controller,
  Get,
  Post,
  Put,
  Req,
  Body,
  Param,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  HttpException,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { existsSync, unlink } from 'fs';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { CreateUserDto } from './dto/createUser.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    return this.usersService.getUsersWithRoles();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    try {
      const userId = parseInt(id);
      return await this.usersService.getUserById(userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2000000 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ) {
    const user = await this.usersService.getUserById(+id);

    if (!user) {
      throw new HttpException(`User not found`, HttpStatus.NOT_FOUND);
    }

    const oldImage = user.photoProfile;
    let finalImageUrl: string;

    if (file) {
      if (
        existsSync('uploads/users/' + oldImage) &&
        oldImage !== 'default.jpg'
      ) {
        unlink('uploads/users/' + oldImage, (err) => {
          if (err) throw err;
        });
      }
      finalImageUrl = file.filename;
    } else {
      finalImageUrl = oldImage;
    }

    // Capture the response from the service
    const serviceResponse = await this.usersService.updateUser(+id, {
      ...updateUserDto,
      photoProfile: finalImageUrl,
    });

    // Return the full service response
    return serviceResponse;
  }
  @Delete('delete/:id')
  async deleteUser(@Param('id') id: string) {
    try {
      const userId = parseInt(id);
      return await this.usersService.deleteUser(userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
