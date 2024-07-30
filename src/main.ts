// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { urlencoded, json } from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as dotenv from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Support application/x-www-form-urlencoded
  app.use(urlencoded({ extended: true }));
  app.use(json());
  dotenv.config(); // Load environment variables from .env file

  // Menyajikan file statis dari direktori uploads/catalog_images
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads/catalog_images'), {
    prefix: '/uploads/catalog_images',
  });

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(5000);
}
bootstrap();
