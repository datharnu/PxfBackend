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

export default router;
