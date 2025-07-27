import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import BadRequestError from "../errors/badRequest";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register with email/password
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { fullname, email, password, confirmPassword } = req.body;
  try {
    console.log("Signup request received:", { fullname, email }); // Debug log

    // Input validation
    if (!fullname || !email || !password || !confirmPassword) {
      console.log("Validation failed: Missing fields");
      throw new BadRequestError("All fields are required");
    }

    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Validation failed: Invalid email format");
      throw new BadRequestError("Invalid email format");
    }

    // Password strength validation
    if (password.length < 6) {
      console.log("Validation failed: Password too short");
      throw new BadRequestError("Password must be at least 6 characters long");
    }

    if (password !== confirmPassword) {
      console.log("Validation failed: Password mismatch");
      throw new BadRequestError("Password and confirm password do not match");
    }

    console.log("Checking for existing user...");
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log("Validation failed: Email exists");
      throw new BadRequestError("Email already exists");
    }

    console.log("Hashing password...");
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("Password hashed successfully");

    console.log("Creating user...");
    const user = await User.create({
      fullname,
      email,
      password: hashedPassword,
    });
    console.log("User created successfully:", user.id);

    // Remove password from response
    const userResponse = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Signup error:", error); // Log the actual error
    next(error);
  }
};

// Google Sign-In
export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new BadRequestError("Token is required");
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new BadRequestError("Invalid token");
    }

    const { sub, email, name } = payload;

    if (!email || !name) {
      throw new BadRequestError("Missing required user information");
    }

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        fullname: name,
        email,
        googleId: sub,
        // Password is null for Google users
      });
    } else if (!user.googleId) {
      // Link existing email/password account with Google
      user.googleId = sub;
      await user.save();
    }

    // Remove sensitive data from response
    const userResponse = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      googleId: user.googleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Login with email/password
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !user.password) {
      throw new BadRequestError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestError("Invalid email or password");
    }

    // Remove password from response
    const userResponse = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};
