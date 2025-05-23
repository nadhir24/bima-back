if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
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
import { existsSync, mkdirSync } from 'fs';

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

  // Ensure upload directories exist
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const catalogImagesDir = join(uploadsDir, 'catalog_images');
  if (!existsSync(catalogImagesDir)) {
    mkdirSync(catalogImagesDir, { recursive: true });
  }

  const usersDir = join(uploadsDir, 'users');
  if (!existsSync(usersDir)) {
    mkdirSync(usersDir, { recursive: true });
  }

  const usersImagesDir = join(usersDir, 'images');
  if (!existsSync(usersImagesDir)) {
    mkdirSync(usersImagesDir, { recursive: true });
  }

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

  // Configure static file serving for uploads directory with proper headers
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res, path) => {
      if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
        // Set Cache-Control headers for images
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
    }
  });

  app.use((req, res, next) => {
    if (req.url.match(/^\/uploads\/(catalog_images|users)\/index\.html$/i)) {
      res.status(404).send('Not Found');
      return;
    }
    next();
  });

  // Fix double slashes in URLs
  app.use((req, res, next) => {
    if (req.url.includes('//')) {
      const fixedUrl = req.url.replace(/\/+/g, '/');
      req.url = fixedUrl;
      
      // Jika ini adalah URL gambar, arahkan ulang ke URL yang benar
      if (req.url.match(/^\/uploads\/(catalog_images|users)\/.*\.(jpg|jpeg|png|gif)$/i)) {
        return res.redirect(301, fixedUrl);
      }
    }
    next();
  });

  // Middleware untuk memperbaiki URL dalam respons API
  app.use(function(req, res, next) {
    const originalSend = res.send;
    res.send = function(body) {
      if (typeof body === 'string') {
        // Fix URL dengan pattern domain/[/]uploads/ dalam respons JSON
        body = body.replace(/([^/]):\/\/([^/]+)\/+uploads\//g, '$1://$2/uploads/');
        // Ganti juga pattern yang spesifik dari error yang dilihat
        body = body.replace(/\/\/uploads\//g, '/uploads/');
      }
      return originalSend.call(this, body);
    };
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
        // Send a default image or 404 with proper CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.status(404).send('Image not found');
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
    origin: true, // Allow all origins for image requests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    maxAge: 86400, // 24 hours
  });
  

  await app.listen(port);
}
bootstrap();
