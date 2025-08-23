"use strict";
// // src/index.ts
// import dotenv from "dotenv";
// dotenv.config();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import express, { Request, Response, NextFunction } from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// // Middlewares
// import errorHandlerMiddleware from "./middlewares/errorHandler";
// // Routers
// import authRouter from "./routes/auth";
// import eventRouter from "./routes/event";
// const app = express();
// const PORT = process.env.PORT || 3000;
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// // Health check endpoint
// app.get("/health", (req: Request, res: Response) => {
//   res.status(200).json({
//     success: true,
//     message: "Server is healthy",
//     timestamp: new Date().toISOString(),
//   });
// });
// // API Routes
// app.use("/api/v1/auth", authRouter);
// app.use("/api/v1/events", eventRouter);
// // Error handling middleware (must be last)
// app.use(errorHandlerMiddleware);
// app.get("/", (req: Request, res: Response) => {
//   res.json({
//     message: "Welcome to PXF Restructure with TypeScript by Odunayo API",
//     docs: "/api-docs",
//     status: "Server is running successfully",
//   });
// });
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
// src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Database
const models_1 = __importDefault(require("./models"));
// Middlewares
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
// Routers
const auth_1 = __importDefault(require("./routes/auth"));
const event_1 = __importDefault(require("./routes/event"));
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
app.use("/api/v1/events", event_1.default);
// Error handling middleware (must be last)
app.use(errorHandler_1.default);
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to PXF Restructure with TypeScript by Odunayo API",
        docs: "/api-docs",
        status: "Server is running successfully",
    });
});
// Database connection and server startup
const startServer = async () => {
    try {
        // Test database connection
        await models_1.default.sequelize.authenticate();
        console.log("Database connection has been established successfully.");
        const syncOptions = process.env.NODE_ENV === "production"
            ? { alter: false }
            : { alter: true };
        await models_1.default.sequelize.sync(syncOptions);
        console.log("Database synchronized successfully.");
        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
        });
    }
    catch (error) {
        console.error("Unable to connect to the database:", error);
        process.exit(1);
    }
};
// Start the server
startServer();
