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
exports.getPriceForCustomGuests = getPriceForCustomGuests;
const axios_1 = __importDefault(require("axios"));
const planPricing_1 = __importDefault(require("../models/planPricing"));
const customPricingTier_1 = __importDefault(require("../models/customPricingTier"));
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
// Deprecated: Static map replaced by DB-backed pricing
exports.PLAN_PRICING_NGN = {};
function getPlanKey(guestLimit, photoCapLimit) {
    return `${guestLimit}-${photoCapLimit}`;
}
async function getPriceForPlan(guestLimit, photoCapLimit) {
    const row = await planPricing_1.default.findOne({
        where: { guestLimit, photoCapLimit },
    });
    return row?.priceNgn ?? 0;
}
// Compute price for CUSTOM guest tiers (photo cap currently does not affect price)
async function getPriceForCustomGuests(customGuestCount) {
    if (!Number.isFinite(customGuestCount) || customGuestCount <= 1000) {
        return 0;
    }
    const tier = await customPricingTier_1.default.findOne({
        where: {
            minGuests: { [require("sequelize").Op.lte]: customGuestCount },
            // Either max is null (open-ended) or customGuestCount <= max
        },
        order: [["minGuests", "DESC"]],
    });
    if (!tier)
        return 0;
    if (tier.maxGuests == null) {
        // For open-ended tier, apply increments: base 80,000 + 10,000 per additional 1000 above 6000
        const base = tier.priceNgn;
        const extra = Math.ceil((customGuestCount - 6000) / 1000);
        return base + extra * 10000;
    }
    if (customGuestCount <= tier.maxGuests) {
        return tier.priceNgn;
    }
    return 0;
}
