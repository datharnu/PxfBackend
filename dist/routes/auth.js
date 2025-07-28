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
exports.default = router;
