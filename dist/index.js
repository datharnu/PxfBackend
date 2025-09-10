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
// Database
const models_1 = __importDefault(require("./models"));
// Routers
const auth_1 = __importDefault(require("./routes/auth"));
const event_1 = __importDefault(require("./routes/event"));
const media_1 = __importDefault(require("./routes/media"));
const payment_1 = __importDefault(require("./routes/payment"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// app.use(
//   cors({
//     origin:
//       process.env.NODE_ENV === "production"
//         ? process.env.FRONTEND_URL || "http://localhost:3000"
//         : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"], // Allow specific origins in development
//     credentials: true, // Allow cookies to be sent with requests
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
//   })
// );
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
// Serve static files (uploaded media)
app.use("/uploads", express_1.default.static("uploads"));
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
app.use("/api/v1/media", media_1.default);
app.use("/api/v1/payments", payment_1.default);
app.use("/api/v1/admin", admin_1.default);
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
