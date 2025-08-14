import 'express-session';

declare module 'express-session' {
  interface SessionData {
    isGuest?: boolean;
    guestId?: string;
  }
}
