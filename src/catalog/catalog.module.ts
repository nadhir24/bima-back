import { forwardRef, Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PrismaService } from 'prisma/prisma.service';
import { SnapModule } from 'src/payment/snap/snap.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { CartModule } from 'src/cart/cart.module';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, PrismaService],
  imports: [
    forwardRef(() => SnapModule), // Resolve circular dependency with SnapModule
    forwardRef(() => CartModule), // Add CartModule to resolve circular dependency
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
          // Use original name with timestamp to avoid overwriting
          const uniqueSuffix = Date.now();
          const fileName = `${file.originalname.replace(/\s+/g, '_')}-${uniqueSuffix}${extname(file.originalname)}`;
          cb(null, fileName);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Allow only images
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
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
