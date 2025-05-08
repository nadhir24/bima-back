// src/app.module.ts
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { PrismaModule } from 'prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { UsersController } from './users/users.controller';
import { JwtModule } from '@nestjs/jwt'; // Import JwtModule
import { JwtMiddleware } from './auth/jwt.middleware';
import { AdminService } from './admin/admin.service';
import { AdminController } from './admin/admin.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentController } from './payment/payment.controller';
import { ServeStaticModule } from '@nestjs/serve-static'; // Import ServeStaticModule
import { join } from 'path'; // Import join from path
import { ScheduleModule } from '@nestjs/schedule'; // Import ScheduleModule
import { CatalogController } from './catalog/catalog.controller';
import { UserDashboardController } from './user-dashboard/user-dashboard.controller';
import { UserDashboardModule } from './user-dashboard/user-dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Pastikan file .env di root directory
    }),
    // Configure user images
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads', 'users'),
      serveRoot: '/uploads/users',
      serveStaticOptions: {
        index: false,
      },
    }),
    // Configure catalog images
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads', 'catalog_images'),
      serveRoot: '/uploads/catalog_images',
      serveStaticOptions: {
        index: false,
      },
    }),
    ScheduleModule.forRoot(), // Register ScheduleModule
    PrismaModule,
    UsersModule,
    CatalogModule,
    CartModule,
    PaymentModule,
    AuthModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '6h' }, // Token expired in 1 day
    }),
    DashboardModule,
    UserDashboardModule,
  ],
  providers: [AdminService],
  controllers: [AdminController, PaymentController, UserDashboardController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .forRoutes(
        { path: 'users', method: RequestMethod.GET },
        // { path: 'catalog', method: RequestMethod.GET },
        { path: 'admin', method: RequestMethod.GET },
        { path: 'dashboard', method: RequestMethod.GET },
        UsersController,
        // CatalogController,
      );
  }
}
