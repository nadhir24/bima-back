import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthTokenController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
        signOptions: { expiresIn: '6h' }, 
    }),
    UsersModule, 
    PrismaModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, AuthTokenController],
  exports: [AuthService],
})
export class AuthModule {}
