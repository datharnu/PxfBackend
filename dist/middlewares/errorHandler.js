"use strict";
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { Request, Response, NextFunction } from "express";
// import { StatusCodes } from "http-status-codes";
// import { ValidationError as SequelizeValidationError } from "sequelize";
// import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandlerMiddleware = (err, req, res, next) => {
    console.error("Error occurred:", err);
    // Default error values
    let customError = {
        statusCode: err.statusCode || err.status || 500,
        message: err.message || "Something went wrong, please try again later",
        error: {},
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
            const fieldErrors = {};
            err.errors.forEach((error) => {
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
            const fieldErrors = {};
            err.errors.forEach((error) => {
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
    const response = {
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
exports.default = errorHandlerMiddleware;
