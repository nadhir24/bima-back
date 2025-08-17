import { forwardRef, Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PrismaService } from 'prisma/prisma.service';
import { SnapModule } from 'src/payment/snap/snap.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join, parse } from 'path';
import { CartModule } from 'src/cart/cart.module';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, PrismaService],
  imports: [
    forwardRef(() => SnapModule), 
    forwardRef(() => CartModule), 
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'catalog_images');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now();
          const original = file.originalname.replace(/\s+/g, '_');
          const { name, ext } = parse(original);
          // Ensure single extension, e.g. IMG.jpg -> IMG-<ts>.jpg (not IMG.jpg-<ts>.jpg)
          const safeBase = name.replace(/[^A-Za-z0-9._-]/g, '_');
          const fileName = `${safeBase}-${uniqueSuffix}${ext || extname(original)}`;
          cb(null, fileName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
