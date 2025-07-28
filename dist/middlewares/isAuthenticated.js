"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const unathenticated_1 = __importDefault(require("../errors/unathenticated"));
const user_1 = __importDefault(require("../models/user"));
// Load env variables safely
const JWT_SECRET = process.env.JWT_SECRET;
const isUserAuthenticated = async (req, res, next) => {
    let accessToken;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.split(" ")[1];
    }
    else if (req.cookies?.accessToken) {
        accessToken = req.cookies.accessToken;
    }
    try {
        if (!accessToken) {
            throw new unathenticated_1.default("Please sign in");
        }
        console.log("🔍 Token received:", accessToken.substring(0, 20) + "...");
        const payload = jsonwebtoken_1.default.verify(accessToken, JWT_SECRET);
        console.log("🔍 JWT Payload:", {
            id: payload.id,
            email: payload.email,
            isActive: payload.isActive,
            tokenVersion: payload.tokenVersion,
            iat: payload.iat,
            exp: payload.exp,
        });
        // Fetch user from DB to check status
        const user = await user_1.default.findByPk(payload.id);
        console.log("🔍 Database query result:", {
            found: !!user,
            userId: user?.id,
            userEmail: user?.email,
            userIsActive: user?.isActive,
            userTokenVersion: user?.tokenVersion,
        });
        if (!user) {
            console.log("❌ User not found in database with ID:", payload.id);
            throw new unathenticated_1.default("User not found");
        }
        // Optional: Check token version for security
        if (user.tokenVersion !== payload.tokenVersion) {
            console.log("❌ Token version mismatch:", {
                dbVersion: user.tokenVersion,
                tokenVersion: payload.tokenVersion,
            });
            throw new unathenticated_1.default("Token has been invalidated");
        }
        req.user = {
            id: user.id,
            email: user.email,
            isActive: user.isActive,
        };
        console.log("✅ User authenticated successfully:", user.email);
        next();
    }
    catch (error) {
        console.log("❌ Auth error:");
        next(error);
    }
};
exports.default = isUserAuthenticated;
