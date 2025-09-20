// src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Middlewares
import errorHandlerMiddleware from "./middlewares/errorHandler";

// Database
import db from "./models";

// Routers
import authRouter from "./routes/auth";
import eventRouter from "./routes/event";
import mediaRouter from "./routes/media";
import paymentRouter from "./routes/payment";
import adminRouter from "./routes/admin";
import faceManagementRouter from "./routes/faceManagement";

const app = express();
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

app.use(cors());
app.use(express.json({ limit: "250mb" })); // Increase limit to handle large payloads (200MB videos + metadata)
app.use(express.urlencoded({ extended: false, limit: "250mb" })); // Increase limit for form data
app.use(cookieParser());

// Serve static files (uploaded media)
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/media", mediaRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/faces", faceManagementRouter);

// Error handling middleware (must be last)
app.use(errorHandlerMiddleware);

app.get("/", (req: Request, res: Response) => {
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
    await db.sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    const syncOptions =
      process.env.NODE_ENV === "production"
        ? { alter: false }
        : { alter: true };

    await db.sequelize.sync(syncOptions);
    console.log("Database synchronized successfully.");

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
