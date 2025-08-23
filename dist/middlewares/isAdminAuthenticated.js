"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const unauthenticated_1 = __importDefault(require("../errors/unauthenticated"));
const unauthorized_1 = __importDefault(require("../errors/unauthorized"));
const isAdminAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new unauthenticated_1.default("Authentication token required");
        }
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!payload.isActive) {
            throw new unauthenticated_1.default("Account is deactivated");
        }
        // Check if user has admin role
        if (payload.role !== "admin" && payload.role !== "superadmin") {
            throw new unauthorized_1.default("Admin access required");
        }
        // Attach user info to request
        req.user = {
            id: payload.id,
            email: payload.email,
            isActive: payload.isActive,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new unauthenticated_1.default("Invalid authentication token");
        }
        next(error);
    }
};
exports.default = isAdminAuthenticated;
