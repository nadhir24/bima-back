// src/users/user-password/user-password.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateOrUpdateUserPasswordDto } from './dto/create-update-user-password.dto';
// import { MailService } from '../mail/mail.service';
import { decode, sign, verify } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface JwtPayload {
  user_email: string;
}

@Injectable()
export class UserPasswordService {
  constructor(
    private prisma: PrismaService,
    // private mailService: MailService,
  ) {}

  findOne(id: number) {
    return this.prisma.userPassword.findUnique({ where: { userId: id } });
  }

  async createOrUpdate(
    userId: number,
    createOrUpdateUserPasswordDto: CreateOrUpdateUserPasswordDto,
  ) {
    const userPassword = await this.prisma.userPassword.findUnique({
      where: { userId },
    });

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(createOrUpdateUserPasswordDto.new_password, salt);

    if (!userPassword) {
      return await this.prisma.userPassword.create({
        data: {
          userId,
          passwordHash: passHash,
        },
      });
    }

    return await this.prisma.userPassword.update({
      where: { userId },
      data: {
        passwordHash: passHash,
      },
    });
  }

//   async forgotPassword(email: string) {
//     try {
//       const user = await this.prisma.user.findUnique({
//         where: {
//           email: email,
//         },
//       });

//       if (!user) {
//         return { statusCode: 404, message: 'User not found' };
//       }

//       const token = sign(
//         {
//           user_email: email,
//         },
//         process.env.SECRET_KEY,
//       );

//       await this.mailService.sendEmailForgotPassword(email, token);

//       return { statusCode: 200, message: 'An email has been sent to your email' };
//     } catch (e) {
//       return { statusCode: 400, message: e.message };
//     }
//   }

//   async resetPassword(resetPasswordDto: ResetPasswordDto) {
//     try {
//       const valid = verify(resetPasswordDto.token, process.env.SECRET_KEY);

//       if (!valid) {
//         return { statusCode: 401, message: 'Not Authorized' };
//       }

//       const data = decode(resetPasswordDto.token) as JwtPayload;

//       const user = await this.prisma.user.findUnique({
//         where: {
//           email: data.user_email,
//         },
//       });

//       const salt = await bcrypt.genSalt(10);
//       const passHash = await bcrypt.hash(resetPasswordDto.password, salt);

//       await this.prisma.userPassword.update({
//         where: {
//           userId: user.id,
//         },
//         data: {
//           passwordHash: passHash,
//         },
//       });

//       return { statusCode: 200, message: 'Password successfully updated' };
//     } catch (e) {
//       return { statusCode: 400, message: e.message };
//     }
//   }
}
