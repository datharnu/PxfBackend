import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import UnAunthenticatedError from "../errors/unathenticated";
import User from "../models/user";

// Load env variables safely
const JWT_SECRET = process.env.JWT_SECRET as string;

const isUserAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let accessToken: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    accessToken = req.cookies.accessToken;
  }

  try {
    if (!accessToken) {
      throw new UnAunthenticatedError("Please sign in");
    }

    console.log("🔍 Token received:", accessToken.substring(0, 20) + "...");

    const payload = jwt.verify(accessToken, JWT_SECRET) as JwtPayload;

    console.log("🔍 JWT Payload:", {
      id: payload.id,
      email: payload.email,
      isActive: payload.isActive,
      tokenVersion: payload.tokenVersion,
      iat: payload.iat,
      exp: payload.exp,
    });

    // Fetch user from DB to check status
    const user = await User.findByPk(payload.id);
    console.log("🔍 Database query result:", {
      found: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userIsActive: user?.isActive,
      userTokenVersion: user?.tokenVersion,
    });

    if (!user) {
      console.log("❌ User not found in database with ID:", payload.id);
      throw new UnAunthenticatedError("User not found");
    }

    // Optional: Check token version for security
    if (user.tokenVersion !== payload.tokenVersion) {
      console.log("❌ Token version mismatch:", {
        dbVersion: user.tokenVersion,
        tokenVersion: payload.tokenVersion,
      });
      throw new UnAunthenticatedError("Token has been invalidated");
    }

    (req as any).user = {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
    };

    console.log("✅ User authenticated successfully:", user.email);
    next();
  } catch (error) {
    console.log("❌ Auth error:");
    next(error);
  }
};

export default isUserAuthenticated;
