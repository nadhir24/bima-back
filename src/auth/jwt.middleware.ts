import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1]; // Mengambil token dari header Authorization

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.SECRET_KEY, // Secret key untuk memverifikasi JWT
      });
      req.user = decoded; // Menambahkan decoded token ke request untuk digunakan di controller
      next(); // Melanjutkan ke rute selanjutnya
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
}
