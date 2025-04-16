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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Pastikan file .env di root directory
    }),
    PrismaModule,
    UsersModule,
    CatalogModule,
    CartModule,
    PaymentModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '1h' }, // Token expired in 1 hour
    }),
    DashboardModule
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
        { path: 'users/:id', method: RequestMethod.GET }
      )
      .forRoutes(UsersController);
  }
}
