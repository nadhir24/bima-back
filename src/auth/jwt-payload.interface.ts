// src/auth/jwt-payload.interface.ts
export interface JwtPayload {
    email: string;
    id: number; 
    roleId: Array<{ userId: number; roleId: number }>; 
    fullName?: string; 
    phoneNumber?: string; 
  }
  