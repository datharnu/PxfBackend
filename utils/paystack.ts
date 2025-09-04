import axios from "axios";
import PlanPricing from "../models/planPricing";
import CustomPricingTier from "../models/customPricingTier";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface InitTransactionParams {
  email: string;
  amountKobo: number; // Amount in kobo (NGN * 100)
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  currency?: string; // default NGN
}

export interface InitTransactionResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data?: any;
}

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return key;
}

export async function initTransaction(
  params: InitTransactionParams
): Promise<InitTransactionResponse> {
  const secretKey = getSecretKey();
  const payload: any = {
    email: params.email,
    amount: params.amountKobo,
    currency: params.currency || "NGN",
  };
  if (params.reference) payload.reference = params.reference;
  if (params.callback_url) payload.callback_url = params.callback_url;
  if (params.metadata) payload.metadata = params.metadata;

  const res = await axios.post(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data as InitTransactionResponse;
}

export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionResponse> {
  const secretKey = getSecretKey();
  const res = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );
  return res.data as VerifyTransactionResponse;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature?: string
): boolean {
  const crypto = require("crypto");
  const secret = getSecretKey();
  if (!signature) return false;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}

// Pricing map for plans in Naira
// Deprecated: Static map replaced by DB-backed pricing
export const PLAN_PRICING_NGN: Record<string, number> = {};

export function getPlanKey(guestLimit: string, photoCapLimit: string): string {
  return `${guestLimit}-${photoCapLimit}`;
}

export async function getPriceForPlan(
  guestLimit: string,
  photoCapLimit: string
): Promise<number> {
  const row = await PlanPricing.findOne({
    where: { guestLimit, photoCapLimit },
  });
  return row?.priceNgn ?? 0;
}

// Compute price for CUSTOM guest tiers (photo cap currently does not affect price)
export async function getPriceForCustomGuests(
  customGuestCount: number
): Promise<number> {
  if (!Number.isFinite(customGuestCount) || customGuestCount <= 1000) {
    return 0;
  }
  const tier = await CustomPricingTier.findOne({
    where: {
      minGuests: { [require("sequelize").Op.lte]: customGuestCount },
      // Either max is null (open-ended) or customGuestCount <= max
    },
    order: [["minGuests", "DESC"]],
  });
  if (!tier) return 0;
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
