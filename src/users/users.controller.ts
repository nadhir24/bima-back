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
    return await this.usersService.getUsers();
  }
  @Post('create')
async createUser(@Body() createUserDto: CreateUserDto) {
  return this.usersService.signUp(createUserDto);
}

  @Put('update/:id')
  @UseInterceptors(
    FileInterceptor('photoProfile', {
      storage: diskStorage({
        destination: './uploads/image/users',
        filename(req, file, callback) {
          const uniqueSuffix = Date.now() + Math.round(Math.random() * 1e9);
          callback(
            null,
            uniqueSuffix + '.' + file.originalname.split('.').pop(),
          );
        },
      }),
    }),
  )
  async updateUser(
    @Req() req: Request,
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

    await this.usersService.updateUser(+id, {
      ...updateUserDto,
      photoProfile: finalImageUrl,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
    };
  }
}
