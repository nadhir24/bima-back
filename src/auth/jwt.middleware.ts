import {
  HttpStatus,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { PrismaService } from 'prisma/prisma.service'; // Update this path according to your project structure

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: any, res: any, next: () => void) {
    try {
      const jwtKey = req.headers.authorization;

      if (!jwtKey) {
        throw new UnauthorizedException('Not Authorized');
      }

      const token: any = verify(jwtKey, process.env.SECRET_KEY);

      const user = await this.prisma.user.findUnique({
        where: { id: token.user_id },
      });

      if (!user) {
        res.status(HttpStatus.BAD_REQUEST).send({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'You must login first',
        });
      } else {
        next();
      }
    } catch (e) {
      res.status(HttpStatus.UNAUTHORIZED).send({ 
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Unauthorized',
      });
    }
  }
}
