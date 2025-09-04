"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_PRICING_NGN = void 0;
exports.initTransaction = initTransaction;
exports.verifyTransaction = verifyTransaction;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.getPlanKey = getPlanKey;
exports.getPriceForPlan = getPriceForPlan;
const axios_1 = __importDefault(require("axios"));
const PAYSTACK_BASE_URL = "https://api.paystack.co";
function getSecretKey() {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
        throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }
    return key;
}
async function initTransaction(params) {
    const secretKey = getSecretKey();
    const payload = {
        email: params.email,
        amount: params.amountKobo,
        currency: params.currency || "NGN",
    };
    if (params.reference)
        payload.reference = params.reference;
    if (params.callback_url)
        payload.callback_url = params.callback_url;
    if (params.metadata)
        payload.metadata = params.metadata;
    const res = await axios_1.default.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, payload, {
        headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
        },
    });
    return res.data;
}
async function verifyTransaction(reference) {
    const secretKey = getSecretKey();
    const res = await axios_1.default.get(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
            Authorization: `Bearer ${secretKey}`,
        },
    });
    return res.data;
}
function verifyWebhookSignature(rawBody, signature) {
    const crypto = require("crypto");
    const secret = getSecretKey();
    if (!signature)
        return false;
    const hash = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");
    return hash === signature;
}
// Pricing map for plans in Naira
exports.PLAN_PRICING_NGN = {
    // guest-photo pair keys
    "10-5": 0,
    "100-10": 7000,
    "250-15": 12000,
    "500-20": 18000,
    "800-25": 23000,
    "1000-25": 28000,
};
function getPlanKey(guestLimit, photoCapLimit) {
    return `${guestLimit}-${photoCapLimit}`;
}
function getPriceForPlan(guestLimit, photoCapLimit) {
    const key = getPlanKey(guestLimit, photoCapLimit);
    return exports.PLAN_PRICING_NGN[key] ?? 0;
}
