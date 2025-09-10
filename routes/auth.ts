import express from "express";
import {
  googleLogin,
  signup,
  login,
  logout,
  forgotPassword,
  verifyPasswordResetCode,
  getUserInfo,
  resetPassword,
  verifyRefreshToken,
  getNewAccessToken,
  adminSignup,
} from "../controllers/auth";
import { signupValidationRules, validate } from "../utils/customValidations";
import { body } from "express-validator";
import isUserAuthenticated from "../middlewares/isAuthenticated";

const router = express.Router();

router.post("/signup", signupValidationRules(), validate, signup);
router.post("/google-signin", googleLogin);
router.post(
  "/signin",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address"),
  ],
  validate,
  login
);
router.get("/verify-refresh-token", verifyRefreshToken);
router.post("/refresh-token", getNewAccessToken);
router.get("/logout", logout);
router.post(
  "/forgot-password",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address"),
  ],
  validate,
  forgotPassword
);
router.post(
  "/verify-password",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address"),
  ],
  validate,
  verifyPasswordResetCode
);
router.post(
  "/reset-password",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address"),
  ],
  validate,
  resetPassword
);
router.get("/user", isUserAuthenticated, getUserInfo);

// Admin signup endpoint
router.post(
  "/admin-signup",
  [
    body("fullname")
      .trim()
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    }),
    body("adminKey").notEmpty().withMessage("Admin key is required"),
  ],
  validate,
  adminSignup
);

// Test endpoint to check authentication status
router.get("/test-auth", isUserAuthenticated, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    user: req.user,
  });
});

export default router;
