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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Pastikan file .env di root directory
    }),
    // Configure static file serving for user images
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads', 'users'), // Directory where user images are stored
      serveRoot: '/uploads/users', // <<<=== UBAH INI: Sesuaikan dengan next.config.js
      serveStaticOptions: {
        // Optional: Add cache control headers, etc.
        // index: false, // Don't serve index.html
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
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '1d' }, // Token expired in 1 day
    }),
    DashboardModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .exclude(
        { path: 'users', method: RequestMethod.GET },
        { path: 'users/:id', method: RequestMethod.GET },
        { path: 'users/delete/:id', method: RequestMethod.DELETE },
        { path: 'users/:userId/addresses', method: RequestMethod.GET },
        //         { path: 'payment/invoice/notifications', method: RequestMethod.GET },
        //         { path: 'payment/invoice/guest/:invoiceId', method: RequestMethod.GET },
        //         { path: 'payment/invoice/user/:invoiceId', method: RequestMethod.GET },
        //         { path: 'payment/invoice/admin', method: RequestMethod.GET },
        //         { path: 'payment/invoice/admin/:invoiceId', method: RequestMethod.GET },
        // {path:'/payment/invoice/:invoiceId/void', method: RequestMethod.POST}
      )
      .forRoutes(UsersController, PaymentController);
  }
}
