// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { Request, Response, NextFunction } from "express";
// import { StatusCodes } from "http-status-codes";
// import { ValidationError as SequelizeValidationError } from "sequelize";
// import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

// interface CustomError extends Partial<Error> {
//   statusCode?: number;
//   errors?: any;
//   code?: number;
//   keyValue?: Record<string, string>;
//   value?: string;
// }

// const errorHandlerMiddleware = (
//   err: CustomError,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Response => {
//   console.log(err);

//   // eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
//   let errors: Record<string, any> = {
//     statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
//     message: err.message || "Something went wrong, try again later",
//   };

//   // Sequelize custom validation errors
//   if (err.errors) {
//     err.errors.forEach((e: any) => {
//       errors[e.path] = e.msg;
//     });
//     errors.statusCode = StatusCodes.BAD_REQUEST;
//     errors.message = "Invalid data";
//   }

//   // Sequelize validation errors
//   if (err instanceof SequelizeValidationError) {
//     err.errors.forEach((errorItem) => {
//       if (errorItem.path) {
//         errors[errorItem.path] = errorItem.message;
//       }
//     });
//     errors.statusCode = StatusCodes.BAD_REQUEST;
//     errors.message = "Validation Error";
//   }

//   // Mongoose-like validation errors (if you were using Mongo before)
//   if (err.name === "ValidationError") {
//     Object.values(err.errors).forEach((errorObj: any) => {
//       const { properties } = errorObj;
//       errors[properties.path] = properties.message;
//     });
//     errors.statusCode = StatusCodes.BAD_REQUEST;
//     errors.message = err.name;
//   }

//   // JWT token expired
//   if (err.name === "TokenExpiredError") {
//     errors.statusCode = StatusCodes.UNAUTHORIZED;
//     errors.message = "Please sign in again - token expired";
//   }

//   // JWT invalid token
//   if (err.name === "JsonWebTokenError") {
//     errors.statusCode = StatusCodes.UNAUTHORIZED;
//     errors.message = "Invalid refresh token";
//   }

//   // Mongo duplicate key (you're likely not using Mongo anymore, but keeping it just in case)
//   if (err.code === 11000) {
//     errors.message = `Sorry, user with this ${Object.keys(
//       err.keyValue ?? {}
//     )} already exists, please choose another ${Object.keys(
//       err.keyValue ?? {}
//     )}`;
//     errors.statusCode = StatusCodes.BAD_REQUEST;
//   }

//   // CastError (again, more common for MongoDB, but keeping your original logic)
//   if (err.name === "CastError") {
//     errors.message = `No item found with id: ${err.value}`;
//     errors.statusCode = StatusCodes.NOT_FOUND;
//   }

//   const { statusCode, ...details } = errors;

//   return res.status(statusCode).json({
//     success: false,
//     statusCode,
//     error: details,
//   });
// };

// export default errorHandlerMiddleware;

import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  statusCode?: number;
  status?: number;
  errors?: any; // For validation errors with multiple fields
}

const errorHandlerMiddleware = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error occurred:", err);

  // Default error values
  let customError = {
    statusCode: err.statusCode || err.status || 500,
    message: err.message || "Something went wrong, please try again later",
    error: {} as any,
  };

  // Handle your custom error types
  if (err.name === "UnauthenticatedError") {
    customError.statusCode = 401;
    customError.message = err.message || "Authentication required";
  }

  if (err.name === "UnauthorizedError") {
    customError.statusCode = 403;
    customError.message = err.message || "Access forbidden";
  }

  if (err.name === "BadRequestError") {
    customError.statusCode = 400;
    customError.message = err.message || "Bad request";
  }

  if (err.name === "NotFoundError") {
    customError.statusCode = 404;
    customError.message = err.message || "Resource not found";
  }

  // Handle Sequelize validation errors with detailed field information
  if (err.name === "SequelizeValidationError") {
    customError.message = "Validation Error";
    customError.statusCode = 400;

    // Extract field-specific errors
    if (err.errors && Array.isArray(err.errors)) {
      const fieldErrors: { [key: string]: string } = {};
      err.errors.forEach((error: any) => {
        if (error.path && error.message) {
          fieldErrors[error.path] = error.message;
        }
      });
      customError.error = fieldErrors;
    }
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    customError.message = "Duplicate field value entered";
    customError.statusCode = 400;

    // Extract which field caused the unique constraint violation
    if (err.errors && Array.isArray(err.errors)) {
      const fieldErrors: { [key: string]: string } = {};
      err.errors.forEach((error: any) => {
        if (error.path) {
          fieldErrors[error.path] = `${error.path} already exists`;
        }
      });
      customError.error = fieldErrors;
    }
  }

  // Handle general validation errors
  if (err.name === "ValidationError") {
    customError.message = "Validation Error";
    customError.statusCode = 400;
  }

  // Handle cast errors (invalid ID format, etc.)
  if (err.name === "CastError") {
    customError.message = "Resource not found";
    customError.statusCode = 404;
  }

  // Handle duplicate key errors
  if (err.message && err.message.includes("duplicate key")) {
    customError.message = "Duplicate field value entered";
    customError.statusCode = 400;
  }

  // JWT specific errors
  if (err.name === "JsonWebTokenError") {
    customError.message = "Invalid authentication token";
    customError.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    customError.message = "Authentication token has expired";
    customError.statusCode = 401;
  }

  // Send JSON response
  const response: any = {
    success: false,
    statusCode: customError.statusCode,
    error: {
      message: customError.message,
      ...(Object.keys(customError.error).length > 0 && customError.error),
    },
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(customError.statusCode).json(response);
};

export default errorHandlerMiddleware;
