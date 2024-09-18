// import { HttpException, HttpStatus } from '@nestjs/common';
// import { extname, join } from 'path';
// import { existsSync, mkdirSync } from 'fs';
// import { diskStorage } from 'multer';
// import { v4 as uuid } from 'uuid';

// export const multerConfig = {
//   limits: {
//     fileSize: +process.env.MAX_FILE_SIZE || 2 * 1024 * 1024,
//   },
//   fileFilter: (req: any, file: any, cb: any) => {
//     if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
//       cb(null, true);
//     } else {
//       cb(
//         new HttpException(
//           `Unsupported file type ${extname(file.originalname)}`,
//           HttpStatus.BAD_REQUEST,
//         ),
//         false,
//       );
//     }
//   },
//   storage: diskStorage({
//     destination: (req: any, file: any, cb: any) => {
//       const uploadPath = join(__dirname, '..', 'uploads', 'catalog_images');
//       if (!existsSync(uploadPath)) {
//         mkdirSync(uploadPath, { recursive: true });
//       }
//       cb(null, uploadPath);
//     },
//     filename: (req: any, file: any, cb: any) => {
//       cb(null, `${uuid()}${extname(file.originalname)}`);
//     },
//   }),
// };