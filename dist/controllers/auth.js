"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.googleLogin = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_1 = __importDefault(require("../models/user"));
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const google_auth_library_1 = require("google-auth-library");
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
// Google Sign-In
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
    }
    catch (error) {
        next(error);
    }
};
exports.googleLogin = googleLogin;
// Login with email/password
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
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
