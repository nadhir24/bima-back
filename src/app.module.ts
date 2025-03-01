// src/app.module.ts
import { Module, MiddlewareConsumer } from '@nestjs/common';
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
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutController } from './checkout/checkout.controller';
import { AdminService } from './admin/admin.service';
import { AdminController } from './admin/admin.controller';
import { XenditModule } from './xendit/xendit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    XenditModule,
    CatalogModule,
    CartModule,
    PaymentModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '1h' }, // Token expired in 1 hour
    }),
  ],
  providers: [CheckoutService, AdminService],
  controllers: [CheckoutController, AdminController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(UsersController);
  }
}
