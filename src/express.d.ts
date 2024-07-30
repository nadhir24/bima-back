// src/types/express.d.ts
import { User } from '@prisma/client';

declare module 'express' {
  export interface Request {
    user?: User;
  }
}
