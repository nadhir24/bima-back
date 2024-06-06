import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import express, { urlencoded, json } from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Support application/x-www-form-urlencoded
  app.use(urlencoded({ extended: true }));
  app.use(json());

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.use(
    '/uploads/catalog_images',
    express.static(join(__dirname, '..', 'uploads/catalog_images')),
  );

  await app.listen(3000);
}
bootstrap();
