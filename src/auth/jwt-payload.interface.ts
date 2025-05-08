// src/auth/jwt-payload.interface.ts
export interface JwtPayload {
    email: string;
    id: number; // User ID (subject)
    // Add other payload fields as needed
    roleId: Array<{ userId: number; roleId: number }>; // Add roleId with the correct structure
    fullName?: string; // Optional: Add fullName if it's in the payload
    phoneNumber?: string; // Optional: Add phoneNumber if it's in the payload
  }
  