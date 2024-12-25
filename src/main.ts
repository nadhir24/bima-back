import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const port = process.env.PORT || 5000;

  app.useGlobalPipes(new ValidationPipe());


  // Konfigurasi CORS
  app.enableCors({
    origin: true,
  });
  app.use(
    session({
      secret: 'your-secret-key',  // Change to your secret key
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },  // Set to true in production if using https
    }),
  );
  await app.listen(port, () => {
    console.log(`App running on port ${port}`);
  });
}

bootstrap();
