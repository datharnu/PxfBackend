"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../controllers/auth");
const express_1 = __importDefault(require("express"));
const customValidations_1 = require("../utils/customValidations");
const router = express_1.default.Router();
router.post("/signup", (0, customValidations_1.signupValidationRules)(), customValidations_1.validate, auth_1.signup);
exports.default = router;
