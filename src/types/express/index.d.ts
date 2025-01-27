import 'express-session';

declare module 'express-session' {
  interface SessionData {
    guestId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      sessionID: string; // Deklarasi sessionID di Request
    }
  }
}