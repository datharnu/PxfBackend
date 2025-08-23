// src/types/express.d.ts
import { User } from "../models/user"; // Adjust path as needed

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isActive?: boolean;
      };
    }
  }
}
