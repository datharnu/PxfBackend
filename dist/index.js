"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Middlewares
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
// Routers
const auth_1 = __importDefault(require("./routes/auth"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy",
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use("/api/v1/auth", auth_1.default);
// Error handling middleware (must be last)
app.use(errorHandler_1.default);
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to PXF Restructure with TypeScript by Odunayo API",
        docs: "/api-docs",
        status: "Server is running successfully",
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
