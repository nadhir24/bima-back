import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from 'prisma/prisma.service';
import { UserPasswordModule } from './userPassword/userPassword.module';
import { MailModule } from './mail/mail.module';
import { UserRoleModule } from './user-role/user-role.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

@Module({
  providers: [UsersService, PrismaService], 
  controllers: [UsersController],
  exports:[UsersService],
  imports: [
    UserPasswordModule, 
    MailModule, 
    UserRoleModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'users');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now();
          const fileName = `${file.originalname.replace(/\s+/g, '_')}-${uniqueSuffix}${extname(file.originalname)}`;
          cb(null, fileName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, 
      },
    }),
  ]
})
export class UsersModule {}
