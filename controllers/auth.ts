import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import BadRequestError from "../errors/badRequest";
import { OAuth2Client } from "google-auth-library";
import { StatusCodes } from "http-status-codes";
import { removeTokenFromResponse } from "../utils/handleCookies";
import NotFoundError from "../errors/notFound";
import crypto from "node:crypto";
import UnAunthenticatedError from "../errors/unathenticated";
import {
  sendPasswordResetCode,
  sendWelcomeMessage,
} from "../utils/emailSender";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

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

    await sendWelcomeMessage({
      sender: process.env.EMAIL_SENDER ?? "",
      recipient: user.email ?? "",
      user: user.fullname ?? "",
    });
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

    // Generate tokens
    const accessToken = await user.createJWT();
    const refreshToken = await user.createRefreshToken();

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Remove password from response
    const userResponse = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Set refresh token as httpOnly cookie (optional - for web security)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        accessToken,
        refreshToken, // Also include in response for mobile apps
      },
    });
  } catch (error) {
    next(error);
  }
};

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

    // Generate tokens
    const accessToken = await user.createJWT();
    const refreshToken = await user.createRefreshToken();

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Remove sensitive data from response
    const userResponse = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      googleId: user.googleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Set refresh token as httpOnly cookie (optional - for web security)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      data: {
        user: userResponse,
        accessToken,
        refreshToken, // Also include in response for mobile apps
      },
    });
  } catch (error) {
    next(error);
  }
};

// export const logout = (req: Request, res: Response) => {
//   removeTokenFromResponse(res);
//   res.status(StatusCodes.OK).json({
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: "logged out successful",
//     data: {},
//   });
// };

// export const forgotPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { email } = req.body;

//   try {
//     const user = await User.findOne({ where: { email: email ?? "" } });
//     if (!user) {
//       throw new NotFoundError("User not found");
//     }

//     // generate 4 digit verification code
//     const verificationCode = crypto.randomInt(1000, 9999).toString();
//     const expires = new Date(Date.now() + 10 * 60 * 1000);

//     user.verificationCode = verificationCode;
//     user.verificationCodeExpires = expires;
//     await user.save();

//     // send reset password code
//     sendPasswordResetCode({
//       sender: process.env.EMAIL_SENDER ?? "",
//       recipient: user.email ?? "",
//       verificationCode,
//       user: user.fullname ?? "",
//     });
//     res.status(StatusCodes.OK).json({
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: "password reset code has been sent to email",
//       data: {},
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const verifyEmail = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { email, code } = req.body;
//   try {
//     const user = await User.findOne({
//       where: {
//         email,
//         verificationCode: code,
//         verificationCodeExpires: {
//           [Op.gt]: Date.now(),
//         },
//       },
//     });

//     if (!user) {
//       throw new BadRequestError("invalid or expired code");
//     }
//     // user.isVerified = true;
//     user.verificationCode = undefined;

//     await user.save();
//     res.status(StatusCodes.OK).json({
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: "Email verified successfully",
//       data: {},
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const resetPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { email, password, confirmPassword } = req.body;
//   try {
//     const user = await User.findOne({ where: { email } });
//     if (!user) {
//       throw new NotFoundError("user not found");
//     }
//     if (password != confirmPassword) {
//       throw new BadRequestError("passwords do not match");
//     }
//     // if (!user.isVerified) {
//     //   throw new UnAunthenticatedError("please verify your email");
//     // }

//     user.password = await user.hashPassword(password);

//     await user.save();

//     res.status(StatusCodes.OK).json({
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: "password updated successfully",
//       data: {},
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const getNewAccessToken = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;

//   try {
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       throw new UnAunthenticatedError("no token provided");
//     }

//     const refreshToken = authHeader.split(" ")[1];

//     const decoded = jwt.verify(
//       refreshToken,
//       process.env.REFRESH_TOKEN_SECRET as string
//     ) as jwt.JwtPayload;

//     const user = await User.findByPk(decoded.id);
//     if (!user || user.refreshToken !== refreshToken) {
//       throw new UnAunthenticatedError("Invalid refresh token");
//     }

//     const newAccessToken = await user.createJWT();

//     return res.status(StatusCodes.OK).json({
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: "generated new access token",
//       data: {
//         accessToken: newAccessToken,
//         refreshToken,
//         refresh_token_expiry: process.env.REFRESH_TOKEN_LIFETIME,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const verifyRefreshToken = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     throw new UnAunthenticatedError("No token provided");
//   }

//   const refreshToken = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(
//       refreshToken,
//       process.env.REFRESH_TOKEN_SECRET as string
//     ) as jwt.JwtPayload;

//     const user = await User.findByPk(decoded.id);
//     if (!user || user.refreshToken !== refreshToken) {
//       throw new UnAunthenticatedError("Invalid refresh token");
//     }

//     return res.status(StatusCodes.OK).json({
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: "Refresh token is valid",
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  try {
    // Input validation
    if (!email || !isValidEmail(email)) {
      throw new BadRequestError("Valid email is required");
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // Security: Always return success to prevent email enumeration
    // Don't reveal whether user exists or not
    const successResponse = {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        "If an account with that email exists, a password reset code has been sent",
      data: {},
    };

    if (!user) {
      return res.status(StatusCodes.OK).json(successResponse);
    }

    // Check rate limiting - prevent spam
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (
      user.lastPasswordResetRequest &&
      user.lastPasswordResetRequest > fiveMinutesAgo
    ) {
      return res.status(StatusCodes.OK).json(successResponse);
    }

    // Generate 6-digit code for better security
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Hash the verification code before storing
    const hashedCode = await user.hashPassword(verificationCode);

    user.verificationCode = hashedCode;
    user.verificationCodeExpires = expires;
    user.lastPasswordResetRequest = now;
    await user.save();

    // Send reset password code
    await sendPasswordResetCode({
      sender: process.env.EMAIL_SENDER ?? "",
      recipient: user.email ?? "",
      verificationCode, // Send plain code via email
      user: user.fullname ?? "",
    });

    res.status(StatusCodes.OK).json(successResponse);
  } catch (error) {
    next(error);
  }
};

// export const verifyPasswordResetCode = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { email, code } = req.body;

//   // Debug logging
//   console.log(`Verification attempt - Email: ${email}, Code: ${code}`);

//   try {
//     // Validate input
//     if (!email || !code) {
//       throw new BadRequestError("Email and code are required");
//     }

//     // Find user with valid code
//     const user = await User.findOne({
//       where: {
//         email: email.toLowerCase().trim(),
//         verificationCodeExpires: { [Op.gt]: new Date() },
//       },
//     });

//     // Debug logging
//     console.log(`User found: ${!!user}`);
//     if (user) {
//       console.log(`Stored code: ${user.verificationCode}`);
//       console.log(`Code expires: ${user.verificationCodeExpires}`);
//     }

//     if (!user) {
//       throw new BadRequestError("Invalid or expired verification code");
//     }

//     // Compare codes - assuming plain text storage
//     if (user.verificationCode !== code) {
//       throw new BadRequestError("Invalid verification code");
//     }

//     // Generate reset token
//     const resetToken = jwt.sign(
//       { id: user.id, email: user.email },
//       process.env.RESET_TOKEN_SECRET!,
//       { expiresIn: "10m" }
//     );

//     // Clear verification data
//     await user.update({
//       verificationCode: null,
//       verificationCodeExpires: null,
//     });

//     return res.status(200).json({
//       success: true,
//       resetToken,
//     });
//   } catch (error) {
//     console.error("Verification error:", error);
//     next(error);
//   }
// };

export const verifyPasswordResetCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, code } = req.body;

  console.log("=== Verification Attempt ===");
  console.log(`Email: ${email}`);
  console.log(`Code: ${code}`);

  try {
    // Input validation
    if (!email || !code) {
      throw new BadRequestError("Email and verification code are required");
    }

    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestError("Verification code must be 6 digits");
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new BadRequestError("No user found with this email");
    }

    console.log("=== User Found ===");
    console.log(`Stored code hash: ${user.verificationCode}`);
    console.log(`Expires: ${user.verificationCodeExpires}`);
    console.log(`Current time: ${new Date()}`);

    // Verify the code using the model method
    const isValid = await user.compareVerificationCode(code);
    if (!isValid) {
      console.log("Invalid or expired verification code");
      throw new BadRequestError("Invalid or expired verification code");
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, purpose: "password_reset" },
      process.env.RESET_TOKEN_SECRET!,
      { expiresIn: "10m" }
    );

    // Clear verification code
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    console.log("Verification successful");
    res.status(200).json({
      success: true,
      resetToken,
    });
  } catch (error) {
    console.error("Verification error:", error);
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, confirmPassword } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError("user not found");
    }
    if (password != confirmPassword) {
      throw new BadRequestError("passwords do not match");
    }

    user.password = await user.hashPassword(password);

    await user.save();

    res.status(StatusCodes.OK).json({
      success: true,
      statusCode: StatusCodes.OK,
      message: "password updated successfully",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

export const getNewAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnAunthenticatedError("No token provided");
    }

    const refreshToken = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as jwt.JwtPayload;

    const user = await User.findByPk(decoded.id);

    if (
      !user ||
      user.refreshToken !== refreshToken ||
      (user.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion)
    ) {
      throw new UnAunthenticatedError("Invalid refresh token");
    }

    // Check if user account is still active
    if (!user.isActive) {
      throw new UnAunthenticatedError("Account is no longer active");
    }

    const newAccessToken = await user.createJWT();

    // Optional: Rotate refresh token for enhanced security
    // const newRefreshToken = await user.createRefreshToken();
    // user.refreshToken = newRefreshToken;
    // await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      statusCode: StatusCodes.OK,
      message: "Generated new access token",
      data: {
        accessToken: newAccessToken,
        refreshToken, // or newRefreshToken if rotating
        expiresIn: process.env.ACCESS_TOKEN_LIFETIME || "15m",
      },
    });
  } catch (error) {
    const err = error as Error;
    if (err.name === "TokenExpiredError") {
      return next(new UnAunthenticatedError("Refresh token has expired"));
    }
    next(error);
  }
};

export const verifyRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnAunthenticatedError("No token provided");
    }

    const refreshToken = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as jwt.JwtPayload;

    const user = await User.findByPk(decoded.id);

    if (
      !user ||
      user.refreshToken !== refreshToken ||
      (user.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion)
    ) {
      throw new UnAunthenticatedError("Invalid refresh token");
    }

    // Check if user account is still active
    if (!user.isActive) {
      throw new UnAunthenticatedError("Account is no longer active");
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      statusCode: StatusCodes.OK,
      message: "Refresh token is valid",
      data: {
        userId: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    const err = error as Error;
    if (err.name === "TokenExpiredError") {
      return next(new UnAunthenticatedError("Refresh token has expired"));
    }
    next(error);
  }
};

// Utility functions (implement these based on your needs)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Additional logout controller for security
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Logged out successfully",
      });
    }

    const refreshToken = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as jwt.JwtPayload;

    const user = await User.findByPk(decoded.id);
    if (user && user.refreshToken === refreshToken) {
      user.refreshToken = null;
      await user.save();
    }

    res.status(StatusCodes.OK).json({
      success: true,
      statusCode: StatusCodes.OK,
      message: "Logged out successfully",
      data: {},
    });
  } catch (error) {
    // Even if token verification fails, return success for logout
    res.status(StatusCodes.OK).json({
      success: true,
      statusCode: StatusCodes.OK,
      message: "Logged out successfully",
      data: {},
    });
  }
};

export const getUserInfo = async (
  req: Request, // Use standard Request type
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnAunthenticatedError("User not authenticated");
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      throw new UnAunthenticatedError("User not found");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "User information retrieved successfully",
      data: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};
