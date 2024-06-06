import { HttpException, HttpStatus } from '@nestjs/common';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';

// Multer upload options
export const multerConfig = {
  // Enable file size limits
  limits: {
    fileSize: +process.env.MAX_FILE_SIZE || 2 * 1024 * 1024, // Default to 2MB if not defined
  },
  // Check the mimetypes to allow for upload
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      // Allow storage for image files
      cb(null, true);
    } else {
      // Reject file
      cb(
        new HttpException(
          `Unsupported file type ${extname(file.originalname)}`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  // Storage properties
  storage: diskStorage({
    // Destination storage path details
    destination: (req: any, file: any, cb: any) => {
      const uploadPath = process.env.UPLOAD_PATH || 'uploads/catalog_images';
      console.log('Upload Path:', uploadPath); // Check what the uploadPath is

      // Create folder if doesn't exist
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true }); // Ensure the directory is created recursively
      }
      cb(null, uploadPath);
    },
    // File modification details
    filename: (req: any, file: any, cb: any) => {
      // Generating a unique filename using UUID
      cb(null, `${uuid()}${extname(file.originalname)}`);
    },
  }),
};
