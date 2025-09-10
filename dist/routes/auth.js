"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../controllers/auth");
const customValidations_1 = require("../utils/customValidations");
const express_validator_1 = require("express-validator");
const isAuthenticated_1 = __importDefault(require("../middlewares/isAuthenticated"));
const router = express_1.default.Router();
router.post("/signup", (0, customValidations_1.signupValidationRules)(), customValidations_1.validate, auth_1.signup);
router.post("/google-signin", auth_1.googleLogin);
router.post("/signin", [
    (0, express_validator_1.body)("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Must be a valid email address"),
], customValidations_1.validate, auth_1.login);
router.get("/verify-refresh-token", auth_1.verifyRefreshToken);
router.post("/refresh-token", auth_1.getNewAccessToken);
router.get("/logout", auth_1.logout);
router.post("/forgot-password", [
    (0, express_validator_1.body)("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Must be a valid email address"),
], customValidations_1.validate, auth_1.forgotPassword);
router.post("/verify-password", [
    (0, express_validator_1.body)("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Must be a valid email address"),
], customValidations_1.validate, auth_1.verifyPasswordResetCode);
router.post("/reset-password", [
    (0, express_validator_1.body)("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Must be a valid email address"),
], customValidations_1.validate, auth_1.resetPassword);
router.get("/user", isAuthenticated_1.default, auth_1.getUserInfo);
// Admin signup endpoint
router.post("/admin-signup", [
    (0, express_validator_1.body)("fullname")
        .trim()
        .notEmpty()
        .withMessage("Full name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Full name must be between 2 and 100 characters"),
    (0, express_validator_1.body)("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Must be a valid email address"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long"),
    (0, express_validator_1.body)("confirmPassword").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Password confirmation does not match password");
        }
        return true;
    }),
    (0, express_validator_1.body)("adminKey").notEmpty().withMessage("Admin key is required"),
], customValidations_1.validate, auth_1.adminSignup);
// Test endpoint to check authentication status
router.get("/test-auth", isAuthenticated_1.default, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Authentication successful",
        user: req.user,
    });
});
exports.default = router;
