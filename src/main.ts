import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as session from 'express-session';
import { json } from 'express'; 

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const port = process.env.PORT || 5000;

  app.useGlobalPipes(new ValidationPipe());

  app.use(json()); 

  // Konfigurasi CORS
  app.enableCors({
    origin: true,
    // credentials: true, 
  });

  
  await app.listen(port, () => {
    console.log(`App running on port ${port}`);
  });
}

bootstrap();
