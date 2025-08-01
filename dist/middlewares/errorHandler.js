"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const errorHandlerMiddleware = (err, req, res, next) => {
    console.log(err);
    // eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
    let errors = {
        statusCode: err.statusCode || http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
        message: err.message || "Something went wrong, try again later",
    };
    // Sequelize custom validation errors
    if (err.errors) {
        err.errors.forEach((e) => {
            errors[e.path] = e.msg;
        });
        errors.statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        errors.message = "Invalid data";
    }
    // Sequelize validation errors
    if (err instanceof sequelize_1.ValidationError) {
        err.errors.forEach((errorItem) => {
            if (errorItem.path) {
                errors[errorItem.path] = errorItem.message;
            }
        });
        errors.statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        errors.message = "Validation Error";
    }
    // Mongoose-like validation errors (if you were using Mongo before)
    if (err.name === "ValidationError") {
        Object.values(err.errors).forEach((errorObj) => {
            const { properties } = errorObj;
            errors[properties.path] = properties.message;
        });
        errors.statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        errors.message = err.name;
    }
    // JWT token expired
    if (err.name === "TokenExpiredError") {
        errors.statusCode = http_status_codes_1.StatusCodes.UNAUTHORIZED;
        errors.message = "Please sign in again - token expired";
    }
    // JWT invalid token
    if (err.name === "JsonWebTokenError") {
        errors.statusCode = http_status_codes_1.StatusCodes.UNAUTHORIZED;
        errors.message = "Invalid refresh token";
    }
    // Mongo duplicate key (you're likely not using Mongo anymore, but keeping it just in case)
    if (err.code === 11000) {
        errors.message = `Sorry, user with this ${Object.keys(err.keyValue ?? {})} already exists, please choose another ${Object.keys(err.keyValue ?? {})}`;
        errors.statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
    }
    // CastError (again, more common for MongoDB, but keeping your original logic)
    if (err.name === "CastError") {
        errors.message = `No item found with id: ${err.value}`;
        errors.statusCode = http_status_codes_1.StatusCodes.NOT_FOUND;
    }
    const { statusCode, ...details } = errors;
    return res.status(statusCode).json({
        success: false,
        statusCode,
        error: details,
    });
};
exports.default = errorHandlerMiddleware;
