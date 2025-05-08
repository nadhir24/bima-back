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
  ParseIntPipe,
  Query,
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
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      
      // Log request parameters
      console.log('Fetching users with parameters:', {
        page: pageNum,
        limit: limitNum,
        search: search || 'none'
      });
      
      return await this.usersService.getUsersWithRoles(pageNum, limitNum, search);
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw new HttpException(
        error.message || 'Failed to fetch users',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    try {
      const user = await this.usersService.getUserById(id);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/addresses')
  async getUserAddresses(@Param('id', ParseIntPipe) id: number) {
    try {
      const addresses = await this.usersService.getUserAddresses(id);
      if (!addresses) { // addresses could be null or empty array
        return []; // Return empty array if no addresses found or user doesn't exist
      }
      return addresses;
    } catch (error) {
      console.error(`Error fetching addresses for user ${id}:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch user addresses', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
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
    image: Express.Multer.File,
  ) {
    const user = await this.usersService.getUserById(+id);

    if (!user) {
      throw new HttpException(`User not found`, HttpStatus.NOT_FOUND);
    }

    const oldImage = user.photoProfile;
    let finalImageUrl: string;

    if (image) {
      if (
        existsSync('uploads/users/' + oldImage) &&
        oldImage !== 'default.jpg'
      ) {
        unlink('uploads/users/' + oldImage, (err) => {
          if (err) throw err;
        });
      }
      finalImageUrl = `/uploads/users/${image.filename}`;
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

  @Post(':id/addresses')
  async addUserAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() addressDto: {
      label?: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      isDefault?: boolean;
    }
  ) {
    try {
      return await this.usersService.addOrUpdateUserAddress(id, addressDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add/update address',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
