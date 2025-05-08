import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, ExceptionFilter, Catch, ArgumentsHost, HttpException, NotFoundException } from '@nestjs/common';
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
    
    // Check if this is a NotFoundException trying to access an index file in uploads
    if (exception instanceof NotFoundException && request.url.includes('index.html') && 
        (request.url.startsWith('/uploads/catalog_images') || request.url.startsWith('/uploads/users'))) {
      this.logger.warn(`Prevented serving index.html for: ${request.url}`);
      response.status(404).send('Not Found');
      return;
    }
    
    // Check if this is an image request that resulted in a 404
    if (exception instanceof NotFoundException && 
        (request.url.startsWith('/uploads/catalog_images/') || 
         request.url.startsWith('/uploads/users/'))) {
      this.logger.warn(`Image not found: ${request.url}`);
      response.status(404).send('Image not found');
      return;
    }
    
    // Get validation errors if they exist
    let validationErrors = null;
    if (exception.response && exception.response.message) {
      validationErrors = exception.response.message;
    }
    
    // Log the detailed error information
    this.logger.error({
      Error: exception.message || 'Internal Server Error',
      Stack: exception.stack || 'No stack trace',
      Path: request.url || 'No URL',
      Method: request.method || 'No method',
      'Content-Type': request.headers['content-type'] || undefined,
      Headers: request.headers || {},
      Body: request.body || {},
      Query: request.query || {},
      Params: request.params || {},
      'Validation Errors': validationErrors || 'None',
    });
    
    // Let the default exception handler take over
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : 500;
    
    response.status(status).json({
      statusCode: status,
      message: exception.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: exception.stack }),
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false // Disable the built-in body parser
  });
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT || 5000;

  // Add global exception filter
  app.useGlobalFilters(new GlobalExceptionLogger());

  // Configure body parsers explicitly
  app.use(json({ limit: '50mb' })); // For JSON payloads
  app.use(urlencoded({ extended: true, limit: '50mb' })); // For URL-encoded payloads

  // Configure express-session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'bimasecret123',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));

  // Intercept requests for index.html in uploads directories *before* ServeStaticModule
  app.use((req, res, next) => {
    if (req.url.match(/^\/uploads\/(catalog_images|users)\/index\.html$/i)) {
      logger.warn(`Intercepted request for index.html in uploads: ${req.url}`);
      res.status(404).send('Not Found'); // Explicitly deny access
      return; // Stop further processing
    }
    next();
  });

  // Fix double slashes in image paths
  app.use((req, res, next) => {
    // Check if the URL has a double slash in the path segment
    if (req.url.includes('//')) {
      // Fix the path by replacing double slashes with single slashes
      const fixedUrl = req.url.replace(/\/+/g, '/');
      logger.log(`Fixed double slash in URL: ${req.url} -> ${fixedUrl}`);
      req.url = fixedUrl;
    }
    next();
  });

  // Add custom middleware to handle image requests directly and bypass routing
  app.use((req, res, next) => {
    // Check if the request is for an image
    if (req.url.match(/^\/uploads\/(catalog_images|users)\/.*\.(jpg|jpeg|png|gif)$/i)) {
      const imagePath = join(process.cwd(), req.url);
      
      // Log it but continue processing - ServeStaticModule will handle the file
      logger.log(`Direct image request: ${req.url}`);
      
      // Check if file exists (optional extra validation)
      if (!existsSync(imagePath)) {
        logger.warn(`Image not found: ${imagePath}`);
      }
    }
    next();
  });

  // Configure multipart/form-data handling
  app.use((req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      logger.log('Processing multipart/form-data request');
    }
    next();
  });

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
