// middlewares/isAdminAuthenticated.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import UnAunthenticatedError from "../errors/unauthenticated";
import UnauthorizedError from "../errors/unauthorized";

interface JWTPayload {
  id: string;
  email: string;
  role?: string; // Add role to your JWT payload
  isActive: boolean;
}

const isAdminAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnAunthenticatedError("Authentication token required");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (!payload.isActive) {
      throw new UnAunthenticatedError("Account is deactivated");
    }

    // Check if user has admin role
    if (payload.role !== "admin" && payload.role !== "superadmin") {
      throw new UnauthorizedError("Admin access required");
    }

    // Attach user info to request
    req.user = {
      id: payload.id,
      email: payload.email,
      isActive: payload.isActive,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnAunthenticatedError("Invalid authentication token");
    }
    next(error);
  }
};

export default isAdminAuthenticated;
