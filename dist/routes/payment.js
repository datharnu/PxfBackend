"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_1 = require("../controllers/payment");
const isAuthenticated_1 = __importDefault(require("../middlewares/isAuthenticated"));
const router = (0, express_1.Router)();
router.post("/init", isAuthenticated_1.default, payment_1.initPayment);
router.get("/verify/:reference", isAuthenticated_1.default, payment_1.verifyPayment);
exports.default = router;
