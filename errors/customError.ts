import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  statusCode?: number;
  status?: number;
}

const errorHandlerMiddleware = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error occurred:", err);

  // Default error values
  const customError = {
    statusCode: err.statusCode || err.status || 500,
    message: err.message || "Something went wrong, please try again later",
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    customError.message = "Validation Error";
    customError.statusCode = 400;
  }

  if (err.name === "CastError") {
    customError.message = "Resource not found";
    customError.statusCode = 404;
  }

  // Handle duplicate key errors (e.g., unique constraint violations)
  if (err.message && err.message.includes("duplicate key")) {
    customError.message = "Duplicate field value entered";
    customError.statusCode = 400;
  }

  // Sequelize specific errors
  if (err.name === "SequelizeValidationError") {
    customError.message = "Validation Error";
    customError.statusCode = 400;
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    customError.message = "Duplicate field value entered";
    customError.statusCode = 400;
  }

  // Send JSON response instead of HTML
  res.status(customError.statusCode).json({
    success: false,
    error: customError.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandlerMiddleware;
