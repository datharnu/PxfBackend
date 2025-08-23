// // src/index.ts
// import dotenv from "dotenv";
// dotenv.config();

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
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Database
import db from "./models";

// Middlewares
import errorHandlerMiddleware from "./middlewares/errorHandler";

// Routers
import authRouter from "./routes/auth";
import eventRouter from "./routes/event";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

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
