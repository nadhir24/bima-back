import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  Logger,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as session from 'express-session';
import { json, urlencoded } from 'express';
import { join } from 'path';
import * as express from 'express';
import { existsSync } from 'fs';

@Catch()
class GlobalExceptionLogger implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (
      exception instanceof NotFoundException &&
      request.url.includes('index.html') &&
      (request.url.startsWith('/uploads/catalog_images') ||
        request.url.startsWith('/uploads/users'))
    ) {
      response.status(404).send('Not Found');
      return;
    }

    if (
      exception instanceof NotFoundException &&
      (request.url.startsWith('/uploads/catalog_images/') ||
        request.url.startsWith('/uploads/users/'))
    ) {
      response.status(404).send('Image not found');
      return;
    }

    let validationErrors = null;
    if (exception.response && exception.response.message) {
      validationErrors = exception.response.message;
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    response.status(status).json({
      statusCode: status,
      message: exception.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: exception.stack }),
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT || 5000;

  app.useGlobalFilters(new GlobalExceptionLogger());

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'bimasecret123',
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use((req, res, next) => {
    if (req.url.match(/^\/uploads\/(catalog_images|users)\/index\.html$/i)) {
      res.status(404).send('Not Found');
      return;
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.url.includes('//')) {
      const fixedUrl = req.url.replace(/\/+/g, '/');
      req.url = fixedUrl;
    }
    next();
  });

  app.use((req, res, next) => {
    if (
      req.url.match(
        /^\/uploads\/(catalog_images|users)\/.*\.(jpg|jpeg|png|gif)$/i,
      )
    ) {
      const imagePath = join(process.cwd(), req.url);

      if (!existsSync(imagePath)) {
      }
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
    }
    next();
  });

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
  
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  

  await app.listen(port);
}
bootstrap();
