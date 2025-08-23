"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEventPassword = exports.hashEventPassword = exports.getEventAccessUrl = exports.isValidEventSlug = exports.generateEventPassword = exports.generateEventQRCode = exports.generateEventSlug = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a unique event slug for URL access
 */
const generateEventSlug = () => {
    // Generate a random UUID and take first 8 characters + random suffix
    const uuid = (0, uuid_1.v4)().replace(/-/g, "");
    const randomSuffix = crypto_1.default.randomBytes(4).toString("hex");
    return `${uuid.substring(0, 8)}-${randomSuffix}`.toLowerCase();
};
exports.generateEventSlug = generateEventSlug;
/**
 * Generate QR code data URL for an event
 * @param eventSlug - The unique event slug
 * @returns Promise<string> - Base64 data URL of the QR code
 */
// export const generateEventQRCode = async (
//   eventSlug: string
// ): Promise<string> => {
//   try {
//     const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
//     const eventUrl = `${baseUrl}/event/${eventSlug}`;
//     // Generate QR code with high quality settings
//     const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
//       errorCorrectionLevel: "M",
//       type: "image/png",
//       quality: 0.92,
//       margin: 1,
//       color: {
//         dark: "#000000",
//         light: "#FFFFFF",
//       },
//       width: 256, // 256x256 pixels
//     });
//     return qrCodeDataUrl;
//   } catch (error) {
//     console.error("Error generating QR code:", error);
//     throw new Error("Failed to generate QR code");
//   }
// };
const generateEventQRCode = async (eventSlug) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const eventUrl = `${baseUrl}/event/${eventSlug}`;
        // Generate QR code with high quality settings
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(eventUrl, {
            errorCorrectionLevel: "M",
            type: "image/png",
            margin: 1,
            color: {
                dark: "#000000",
                light: "#FFFFFF",
            },
            width: 256, // 256x256 pixels
        });
        return qrCodeDataUrl;
    }
    catch (error) {
        console.error("Error generating QR code:", error);
        throw new Error("Failed to generate QR code");
    }
};
exports.generateEventQRCode = generateEventQRCode;
/**
 * Generate a secure random password for event access
 * @param length - Length of the password (default: 6)
 * @returns string - Random password
 */
const generateEventPassword = (length = 6) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto_1.default.randomInt(0, charset.length);
        password += charset[randomIndex];
    }
    return password;
};
exports.generateEventPassword = generateEventPassword;
/**
 * Validate event slug format
 * @param slug - The event slug to validate
 * @returns boolean - Whether the slug is valid
 */
const isValidEventSlug = (slug) => {
    // Should be lowercase alphanumeric with hyphens, 10-50 characters
    const slugPattern = /^[a-z0-9-]{10,50}$/;
    return slugPattern.test(slug);
};
exports.isValidEventSlug = isValidEventSlug;
/**
 * Get event access URL from slug
 * @param eventSlug - The unique event slug
 * @returns string - Full URL to access the event
 */
const getEventAccessUrl = (eventSlug) => {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return `${baseUrl}/event/${eventSlug}`;
};
exports.getEventAccessUrl = getEventAccessUrl;
/**
 * Hash password for storage (if needed for password-protected events)
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
const hashEventPassword = async (password) => {
    return new Promise((resolve, reject) => {
        crypto_1.default.pbkdf2(password, "event-salt", 10000, 64, "sha512", (err, derivedKey) => {
            if (err)
                reject(err);
            resolve(derivedKey.toString("hex"));
        });
    });
};
exports.hashEventPassword = hashEventPassword;
/**
 * Verify password for password-protected events
 * @param password - Plain text password to verify
 * @param hashedPassword - Stored hashed password
 * @returns Promise<boolean> - Whether password is correct
 */
const verifyEventPassword = async (password, hashedPassword) => {
    try {
        const hash = await (0, exports.hashEventPassword)(password);
        return hash === hashedPassword;
    }
    catch (error) {
        return false;
    }
};
exports.verifyEventPassword = verifyEventPassword;
