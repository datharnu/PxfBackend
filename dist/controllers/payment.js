"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.verifyPrecreatePayment = exports.initPrecreatePayment = exports.initCustomPayment = exports.initPayment = void 0;
const http_status_codes_1 = require("http-status-codes");
const event_1 = __importStar(require("../models/event"));
const qrCodeGenerator_1 = require("../utils/qrCodeGenerator");
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const notFound_1 = __importDefault(require("../errors/notFound"));
const paystack_1 = require("../utils/paystack");
const qrCodeGenerator_2 = require("../utils/qrCodeGenerator");
function assertAllowedPair(guestLimit, photoCapLimit) {
    const allowed = {
        [event_1.GuestLimit.TEN]: event_1.PhotoCapLimit.FIVE,
        [event_1.GuestLimit.ONE_HUNDRED]: event_1.PhotoCapLimit.TEN,
        [event_1.GuestLimit.TWO_FIFTY]: event_1.PhotoCapLimit.FIFTEEN,
        [event_1.GuestLimit.FIVE_HUNDRED]: event_1.PhotoCapLimit.TWENTY,
        [event_1.GuestLimit.EIGHT_HUNDRED]: event_1.PhotoCapLimit.TWENTY_FIVE,
        [event_1.GuestLimit.ONE_THOUSAND]: event_1.PhotoCapLimit.TWENTY_FIVE,
    };
    if (allowed[guestLimit] !== photoCapLimit) {
        throw new badRequest_1.default("Invalid pairing for plan selection");
    }
}
const initPayment = async (req, res, next) => {
    try {
        const { eventId, guestLimit, photoCapLimit, email } = req.body;
        if (!eventId || !guestLimit || !photoCapLimit || !email) {
            throw new badRequest_1.default("eventId, guestLimit, photoCapLimit and email are required");
        }
        if (guestLimit === event_1.GuestLimit.CUSTOM ||
            photoCapLimit === event_1.PhotoCapLimit.CUSTOM) {
            throw new badRequest_1.default("Use custom pricing flow for CUSTOM limits");
        }
        assertAllowedPair(guestLimit, photoCapLimit);
        const event = await event_1.default.findByPk(eventId);
        if (!event)
            throw new notFound_1.default("Event not found");
        // Calculate price
        const priceNgn = await (0, paystack_1.getPriceForPlan)(guestLimit, photoCapLimit);
        const amountKobo = priceNgn * 100;
        if (priceNgn === 0) {
            await event.update({
                guestLimit,
                photoCapLimit,
                planPrice: 0,
                paymentStatus: event_1.PaymentStatus.FREE,
                paidAt: new Date(),
            });
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: "Free plan applied",
                event,
            });
        }
        const metadata = {
            eventId: event.id,
            plan: `${guestLimit}-${photoCapLimit}`,
            userId: req.user?.id,
        };
        const initRes = await (0, paystack_1.initTransaction)({
            email,
            amountKobo,
            metadata,
            callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined,
        });
        if (!initRes.status || !initRes.data) {
            throw new badRequest_1.default(initRes.message || "Unable to initialize transaction");
        }
        await event.update({
            paymentStatus: event_1.PaymentStatus.PENDING,
            planPrice: priceNgn,
            guestLimit,
            photoCapLimit,
            paystackReference: initRes.data.reference,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            authorizationUrl: initRes.data.authorization_url,
            reference: initRes.data.reference,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.initPayment = initPayment;
const initCustomPayment = async (req, res, next) => {
    try {
        const { eventId, email } = req.body;
        if (!eventId || !email) {
            throw new badRequest_1.default("eventId and email are required");
        }
        const event = await event_1.default.findByPk(eventId);
        if (!event)
            throw new notFound_1.default("Event not found");
        // Validate that event is using CUSTOM and has custom values
        if (event.guestLimit !== event_1.GuestLimit.CUSTOM &&
            event.photoCapLimit !== event_1.PhotoCapLimit.CUSTOM) {
            throw new badRequest_1.default("This event is not using CUSTOM limits. Use standard init endpoint.");
        }
        const customGuests = event.customGuestLimit ?? 0;
        if (!Number.isInteger(customGuests) || customGuests <= 1000) {
            throw new badRequest_1.default("customGuestLimit must be > 1000 for custom pricing");
        }
        const priceNgn = await (0, paystack_1.getPriceForCustomGuests)(customGuests);
        const amountKobo = priceNgn * 100;
        const metadata = {
            eventId: event.id,
            plan: `CUSTOM-${customGuests}`,
            userId: req.user?.id,
        };
        const initRes = await (0, paystack_1.initTransaction)({
            email,
            amountKobo,
            metadata,
            callback_url: process.env.PAYSTACK_CALLBACK_CUSTOM_URL || undefined,
        });
        if (!initRes.status || !initRes.data) {
            throw new badRequest_1.default(initRes.message || "Unable to initialize transaction");
        }
        await event.update({
            paymentStatus: event_1.PaymentStatus.PENDING,
            planPrice: priceNgn,
            paystackReference: initRes.data.reference,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            authorizationUrl: initRes.data.authorization_url,
            reference: initRes.data.reference,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.initCustomPayment = initCustomPayment;
// Initialize payment BEFORE creating a paid event (pre-create flow)
const initPrecreatePayment = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        const { title, description, eventFlyer, guestLimit, photoCapLimit, eventDate, isPasswordProtected, customPassword, customGuestLimit, customPhotoCapLimit, email, } = req.body;
        if (!email)
            throw new badRequest_1.default("email is required");
        if (!title || !description || !guestLimit || !photoCapLimit) {
            throw new badRequest_1.default("Title, description, guestLimit, and photoCapLimit are required");
        }
        if (!Object.values(event_1.GuestLimit).includes(guestLimit)) {
            throw new badRequest_1.default("Invalid guestLimit");
        }
        if (!Object.values(event_1.PhotoCapLimit).includes(photoCapLimit)) {
            throw new badRequest_1.default("Invalid photoCapLimit");
        }
        // Determine price
        let priceNgn = 0;
        if (guestLimit === event_1.GuestLimit.CUSTOM ||
            photoCapLimit === event_1.PhotoCapLimit.CUSTOM) {
            const numGuests = Number(customGuestLimit);
            if (!Number.isInteger(numGuests) || numGuests <= 1000) {
                throw new badRequest_1.default("customGuestLimit must be an integer greater than 1000 for CUSTOM");
            }
            priceNgn = await (0, paystack_1.getPriceForCustomGuests)(numGuests);
        }
        else {
            assertAllowedPair(guestLimit, photoCapLimit);
            priceNgn = await (0, paystack_1.getPriceForPlan)(guestLimit, photoCapLimit);
        }
        if (priceNgn <= 0) {
            throw new badRequest_1.default("This plan appears to be free; use standard create flow");
        }
        const amountKobo = priceNgn * 100;
        const metadata = {
            mode: "precreate",
            userId,
            title,
            description,
            eventFlyer: typeof eventFlyer === "string" && eventFlyer.trim().length > 0
                ? eventFlyer
                : null,
            guestLimit,
            photoCapLimit,
            customGuestLimit: guestLimit === event_1.GuestLimit.CUSTOM ? Number(customGuestLimit) : null,
            customPhotoCapLimit: photoCapLimit === event_1.PhotoCapLimit.CUSTOM
                ? Number(customPhotoCapLimit)
                : null,
            eventDate: eventDate ?? null,
            isPasswordProtected: !!isPasswordProtected,
            customPassword: customPassword ?? null,
        };
        const initRes = await (0, paystack_1.initTransaction)({
            email,
            amountKobo,
            metadata,
            callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined,
        });
        if (!initRes.status || !initRes.data) {
            throw new badRequest_1.default(initRes.message || "Unable to initialize pre-create transaction");
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            authorizationUrl: initRes.data.authorization_url,
            reference: initRes.data.reference,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.initPrecreatePayment = initPrecreatePayment;
// Verify pre-create payment and then create the event
const verifyPrecreatePayment = async (req, res, next) => {
    try {
        const { reference } = req.params;
        if (!reference)
            throw new badRequest_1.default("reference is required");
        const verifyRes = await (0, paystack_1.verifyTransaction)(reference);
        if (!verifyRes.status || !verifyRes.data) {
            throw new badRequest_1.default("Unable to verify transaction");
        }
        const data = verifyRes.data;
        if (data.status !== "success") {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ success: false, message: "Transaction not successful" });
        }
        const md = (data.metadata || {});
        if (md.mode !== "precreate") {
            throw new badRequest_1.default("Invalid transaction mode for pre-create");
        }
        const userId = req.user?.id;
        if (!userId || (md.userId && md.userId !== userId)) {
            // Enforce that the verifying user is the payer/owner
            throw new badRequest_1.default("User mismatch for event creation");
        }
        // Prepare password (no auto-generation)
        let accessPassword = null;
        if (md.isPasswordProtected) {
            const provided = typeof md.customPassword === "string" ? md.customPassword : "";
            if (provided.trim().length < 4) {
                throw new badRequest_1.default("customPassword is required and must be at least 4 characters when password protection is enabled");
            }
            accessPassword = await (0, qrCodeGenerator_2.hashEventPassword)(provided);
        }
        // Generate slug/QR at this point (paid event)
        const slug = (0, qrCodeGenerator_1.generateEventSlug)();
        const qr = await (0, qrCodeGenerator_1.generateEventQRCode)(slug);
        const sanitizedEventFlyer = typeof md.eventFlyer === "string" && md.eventFlyer.trim().length > 0
            ? md.eventFlyer
            : undefined;
        const event = await event_1.default.create({
            title: md.title,
            description: md.description,
            eventFlyer: sanitizedEventFlyer,
            guestLimit: md.guestLimit,
            photoCapLimit: md.photoCapLimit,
            customGuestLimit: md.guestLimit === event_1.GuestLimit.CUSTOM
                ? Number(md.customGuestLimit)
                : null,
            customPhotoCapLimit: md.photoCapLimit === event_1.PhotoCapLimit.CUSTOM
                ? Number(md.customPhotoCapLimit)
                : null,
            eventDate: md.eventDate ? new Date(md.eventDate) : undefined,
            isPasswordProtected: !!md.isPasswordProtected,
            accessPassword: accessPassword ?? undefined,
            eventSlug: slug,
            qrCodeData: qr,
            paymentStatus: event_1.PaymentStatus.PAID,
            planPrice: Math.round(Number(data.amount) / 100), // NGN
            paidAt: new Date(),
            isActive: true,
            paystackReference: reference,
            createdBy: userId,
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Event created after successful payment",
            event,
            accessInfo: {
                eventSlug: slug,
                accessUrl: (0, qrCodeGenerator_2.getEventAccessUrl)(slug),
                qrCodeData: qr,
                isPasswordProtected: !!md.isPasswordProtected,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPrecreatePayment = verifyPrecreatePayment;
const verifyPayment = async (req, res, next) => {
    try {
        const { reference } = req.params;
        if (!reference)
            throw new badRequest_1.default("reference is required");
        const verifyRes = await (0, paystack_1.verifyTransaction)(reference);
        if (!verifyRes.status || !verifyRes.data) {
            throw new badRequest_1.default("Unable to verify transaction");
        }
        const event = await event_1.default.findOne({
            where: { paystackReference: reference },
        });
        if (!event)
            throw new notFound_1.default("Event for reference not found");
        if (verifyRes.data.status === "success") {
            // Generate slug/QR if not yet set, activate event
            let updates = {
                paymentStatus: event_1.PaymentStatus.PAID,
                paidAt: new Date(),
                isActive: true,
            };
            if (!event.eventSlug) {
                const slug = (0, qrCodeGenerator_1.generateEventSlug)();
                const qr = await (0, qrCodeGenerator_1.generateEventQRCode)(slug);
                updates.eventSlug = slug;
                updates.qrCodeData = qr;
            }
            await event.update(updates);
        }
        return res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ success: true, data: verifyRes.data });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPayment = verifyPayment;
