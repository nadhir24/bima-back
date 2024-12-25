// src/types/express/index.d.ts
import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      session: any; // This will allow access to the session property
    }
  }
}
