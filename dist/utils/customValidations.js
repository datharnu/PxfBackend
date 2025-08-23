"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventValidationRules = exports.signupValidationRules = exports.validate = void 0;
const express_validator_1 = require("express-validator");
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
exports.validate = validate;
/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Returns an array of validation rules for user signup.
 *
 * Validates the following fields:
 * - `fullname`: Must be non-empty, between 2 and 100 characters,
 *   and can only contain letters and spaces.
 * - `email`: Must be a valid email address and non-empty.
 *   The email is normalized to lowercase, but dots are retained for Gmail.
 * - `password`: Must be non-empty, at least 8 characters long, and include
 *   at least one uppercase letter, one lowercase letter, one number, and one special character.
 * - `confirmPassword`: Must match the `password` field and be non-empty.
 *
 * @returns {Array} An array of validation chain objects from express-validator.
 */
/*******  28a950e5-6e26-4020-ba62-2d4bf934683e  *******/
const signupValidationRules = () => [
    (0, express_validator_1.body)("fullname")
        .trim()
        .notEmpty()
        .withMessage("Fullname is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Fullname must be between 2 and 100 characters")
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage("Fullname can only contain letters and spaces"),
    (0, express_validator_1.body)("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail({ all_lowercase: true, gmail_remove_dots: false }),
    (0, express_validator_1.body)("password")
        .trim()
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long"),
    (0, express_validator_1.body)("confirmPassword")
        .trim()
        .notEmpty()
        .withMessage("Please confirm your password")
        .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Passwords do not match");
        }
        return true;
    }),
];
exports.signupValidationRules = signupValidationRules;
/**
 * Returns an array of validation rules for event creation.
 *
 * Validates the following fields:
 * - `title`: Must be non-empty, between 3 and 200 characters
 * - `description`: Must be non-empty, between 10 and 2000 characters
 * - `eventFlyer`: Optional, must be a valid URL if provided
 * - `guestLimit`: Must be one of the predefined enum values
 * - `photoCapLimit`: Must be one of the predefined enum values
 * - `eventDate`: Optional, must be a valid future date if provided
 *
 * @returns {Array} An array of validation chain objects from express-validator.
 */
const eventValidationRules = () => [
    (0, express_validator_1.body)("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 3, max: 200 })
        .withMessage("Title must be between 3 and 200 characters"),
    (0, express_validator_1.body)("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ min: 10, max: 2000 })
        .withMessage("Description must be between 10 and 2000 characters"),
    (0, express_validator_1.body)("eventFlyer")
        .optional()
        .isURL()
        .withMessage("Event flyer must be a valid URL"),
    (0, express_validator_1.body)("guestLimit")
        .notEmpty()
        .withMessage("Guest limit is required")
        .isIn(["10", "100", "250", "500", "800", "1000+"])
        .withMessage("Guest limit must be one of: 10, 100, 250, 500, 800, 1000+"),
    (0, express_validator_1.body)("photoCapLimit")
        .notEmpty()
        .withMessage("Photo capture limit is required")
        .isIn(["5", "10", "15", "20", "25"])
        .withMessage("Photo capture limit must be one of: 5, 10, 15, 20, 25"),
    (0, express_validator_1.body)("eventDate")
        .optional()
        .isISO8601()
        .withMessage("Event date must be a valid date")
        .custom((value) => {
        if (value && new Date(value) < new Date()) {
            throw new Error("Event date must be in the future");
        }
        return true;
    }),
];
exports.eventValidationRules = eventValidationRules;
