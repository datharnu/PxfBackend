"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInfo = exports.logout = exports.verifyRefreshToken = exports.getNewAccessToken = exports.resetPassword = exports.verifyPasswordResetCode = exports.forgotPassword = exports.googleLogin = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_1 = __importDefault(require("../models/user"));
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const google_auth_library_1 = require("google-auth-library");
const http_status_codes_1 = require("http-status-codes");
const notFound_1 = __importDefault(require("../errors/notFound"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const unathenticated_1 = __importDefault(require("../errors/unathenticated"));
const emailSender_1 = require("../utils/emailSender");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Register with email/password
const signup = async (req, res, next) => {
    const { fullname, email, password, confirmPassword } = req.body;
    try {
        console.log("Signup request received:", { fullname, email }); // Debug log
        // Input validation
        if (!fullname || !email || !password || !confirmPassword) {
            console.log("Validation failed: Missing fields");
            throw new badRequest_1.default("All fields are required");
        }
        // Email format validation (basic)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log("Validation failed: Invalid email format");
            throw new badRequest_1.default("Invalid email format");
        }
        // Password strength validation
        if (password.length < 6) {
            console.log("Validation failed: Password too short");
            throw new badRequest_1.default("Password must be at least 6 characters long");
        }
        if (password !== confirmPassword) {
            console.log("Validation failed: Password mismatch");
            throw new badRequest_1.default("Password and confirm password do not match");
        }
        console.log("Checking for existing user...");
        const existingUser = await user_1.default.findOne({ where: { email } });
        if (existingUser) {
            console.log("Validation failed: Email exists");
            throw new badRequest_1.default("Email already exists");
        }
        console.log("Hashing password...");
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        console.log("Password hashed successfully");
        console.log("Creating user...");
        const user = await user_1.default.create({
            fullname,
            email,
            password: hashedPassword,
        });
        console.log("User created successfully:", user.id);
        await (0, emailSender_1.sendWelcomeMessage)({
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
    }
    catch (error) {
        console.error("Signup error:", error); // Log the actual error
        next(error);
    }
};
exports.signup = signup;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new badRequest_1.default("Email and password are required");
        }
        const user = await user_1.default.findOne({ where: { email } });
        if (!user || !user.password) {
            throw new badRequest_1.default("Invalid email or password");
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new badRequest_1.default("Invalid email or password");
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
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const googleLogin = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            throw new badRequest_1.default("Token is required");
        }
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            throw new badRequest_1.default("Invalid token");
        }
        const { sub, email, name } = payload;
        if (!email || !name) {
            throw new badRequest_1.default("Missing required user information");
        }
        let user = await user_1.default.findOne({ where: { email } });
        if (!user) {
            user = await user_1.default.create({
                fullname: name,
                email,
                googleId: sub,
                // Password is null for Google users
            });
        }
        else if (!user.googleId) {
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
    }
    catch (error) {
        next(error);
    }
};
exports.googleLogin = googleLogin;
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
const forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    try {
        // Input validation
        if (!email || !isValidEmail(email)) {
            throw new badRequest_1.default("Valid email is required");
        }
        const user = await user_1.default.findOne({
            where: { email: email.toLowerCase().trim() },
        });
        // Security: Always return success to prevent email enumeration
        // Don't reveal whether user exists or not
        const successResponse = {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: "If an account with that email exists, a password reset code has been sent",
            data: {},
        };
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.OK).json(successResponse);
        }
        // Check rate limiting - prevent spam
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        if (user.lastPasswordResetRequest &&
            user.lastPasswordResetRequest > fiveMinutesAgo) {
            return res.status(http_status_codes_1.StatusCodes.OK).json(successResponse);
        }
        // Generate 6-digit code for better security
        const verificationCode = node_crypto_1.default.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        // Hash the verification code before storing
        const hashedCode = await user.hashPassword(verificationCode);
        user.verificationCode = hashedCode;
        user.verificationCodeExpires = expires;
        user.lastPasswordResetRequest = now;
        await user.save();
        // Send reset password code
        await (0, emailSender_1.sendPasswordResetCode)({
            sender: process.env.EMAIL_SENDER ?? "",
            recipient: user.email ?? "",
            verificationCode, // Send plain code via email
            user: user.fullname ?? "",
        });
        res.status(http_status_codes_1.StatusCodes.OK).json(successResponse);
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
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
const verifyPasswordResetCode = async (req, res, next) => {
    const { email, code } = req.body;
    console.log("=== Verification Attempt ===");
    console.log(`Email: ${email}`);
    console.log(`Code: ${code}`);
    try {
        // Input validation
        if (!email || !code) {
            throw new badRequest_1.default("Email and verification code are required");
        }
        if (!/^\d{6}$/.test(code)) {
            throw new badRequest_1.default("Verification code must be 6 digits");
        }
        const user = await user_1.default.findOne({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user) {
            throw new badRequest_1.default("No user found with this email");
        }
        console.log("=== User Found ===");
        console.log(`Stored code hash: ${user.verificationCode}`);
        console.log(`Expires: ${user.verificationCodeExpires}`);
        console.log(`Current time: ${new Date()}`);
        // Verify the code using the model method
        const isValid = await user.compareVerificationCode(code);
        if (!isValid) {
            console.log("Invalid or expired verification code");
            throw new badRequest_1.default("Invalid or expired verification code");
        }
        // Generate reset token
        const resetToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, purpose: "password_reset" }, process.env.RESET_TOKEN_SECRET, { expiresIn: "10m" });
        // Clear verification code
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await user.save();
        console.log("Verification successful");
        res.status(200).json({
            success: true,
            resetToken,
        });
    }
    catch (error) {
        console.error("Verification error:", error);
        next(error);
    }
};
exports.verifyPasswordResetCode = verifyPasswordResetCode;
const resetPassword = async (req, res, next) => {
    const { email, password, confirmPassword } = req.body;
    try {
        const user = await user_1.default.findOne({ where: { email } });
        if (!user) {
            throw new notFound_1.default("user not found");
        }
        if (password != confirmPassword) {
            throw new badRequest_1.default("passwords do not match");
        }
        user.password = await user.hashPassword(password);
        await user.save();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: "password updated successfully",
            data: {},
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
const getNewAccessToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    try {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new unathenticated_1.default("No token provided");
        }
        const refreshToken = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await user_1.default.findByPk(decoded.id);
        if (!user ||
            user.refreshToken !== refreshToken ||
            (user.tokenVersion !== undefined &&
                decoded.tokenVersion !== user.tokenVersion)) {
            throw new unathenticated_1.default("Invalid refresh token");
        }
        // Check if user account is still active
        if (!user.isActive) {
            throw new unathenticated_1.default("Account is no longer active");
        }
        const newAccessToken = await user.createJWT();
        // Optional: Rotate refresh token for enhanced security
        // const newRefreshToken = await user.createRefreshToken();
        // user.refreshToken = newRefreshToken;
        // await user.save();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: "Generated new access token",
            data: {
                accessToken: newAccessToken,
                refreshToken, // or newRefreshToken if rotating
                expiresIn: process.env.ACCESS_TOKEN_LIFETIME || "15m",
            },
        });
    }
    catch (error) {
        const err = error;
        if (err.name === "TokenExpiredError") {
            return next(new unathenticated_1.default("Refresh token has expired"));
        }
        next(error);
    }
};
exports.getNewAccessToken = getNewAccessToken;
const verifyRefreshToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    try {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new unathenticated_1.default("No token provided");
        }
        const refreshToken = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await user_1.default.findByPk(decoded.id);
        if (!user ||
            user.refreshToken !== refreshToken ||
            (user.tokenVersion !== undefined &&
                decoded.tokenVersion !== user.tokenVersion)) {
            throw new unathenticated_1.default("Invalid refresh token");
        }
        // Check if user account is still active
        if (!user.isActive) {
            throw new unathenticated_1.default("Account is no longer active");
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: "Refresh token is valid",
            data: {
                userId: user.id,
                email: user.email,
            },
        });
    }
    catch (error) {
        const err = error;
        if (err.name === "TokenExpiredError") {
            return next(new unathenticated_1.default("Refresh token has expired"));
        }
        next(error);
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
// Utility functions (implement these based on your needs)
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// Additional logout controller for security
const logout = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    try {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: "Logged out successfully",
            });
        }
        const refreshToken = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await user_1.default.findByPk(decoded.id);
        if (user && user.refreshToken === refreshToken) {
            user.refreshToken = null;
            await user.save();
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: "Logged out successfully",
            data: {},
        });
    }
    catch (error) {
        // Even if token verification fails, return success for logout
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: "Logged out successfully",
            data: {},
        });
    }
};
exports.logout = logout;
const getUserInfo = async (req, // Use standard Request type
res, next) => {
    try {
        if (!req.user) {
            throw new unathenticated_1.default("User not authenticated");
        }
        const user = await user_1.default.findByPk(req.user.id);
        if (!user) {
            throw new unathenticated_1.default("User not found");
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "User information retrieved successfully",
            data: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserInfo = getUserInfo;
