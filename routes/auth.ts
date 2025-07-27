import { signup } from "../controllers/auth";
import express from "express";
import { signupValidationRules, validate } from "../utils/customValidations";

const router = express.Router();

router.post("/signup", signupValidationRules(), validate, signup);

export default router;
