import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

/**
 * Generate a unique event slug for URL access
 */
export const generateEventSlug = (): string => {
  // Generate a random UUID and take first 8 characters + random suffix
  const uuid = uuidv4().replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  return `${uuid.substring(0, 8)}-${randomSuffix}`.toLowerCase();
};

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

export const generateEventQRCode = async (
  eventSlug: string
): Promise<string> => {
  try {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const eventUrl = `${baseUrl}/event/${eventSlug}`;

    // Generate QR code with high quality settings
    const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
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
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};
/**
 * Generate a secure random password for event access
 * @param length - Length of the password (default: 6)
 * @returns string - Random password
 */
export const generateEventPassword = (length: number = 6): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
};

/**
 * Validate event slug format
 * @param slug - The event slug to validate
 * @returns boolean - Whether the slug is valid
 */
export const isValidEventSlug = (slug: string): boolean => {
  // Should be lowercase alphanumeric with hyphens, 10-50 characters
  const slugPattern = /^[a-z0-9-]{10,50}$/;
  return slugPattern.test(slug);
};

/**
 * Get event access URL from slug
 * @param eventSlug - The unique event slug
 * @returns string - Full URL to access the event
 */
export const getEventAccessUrl = (eventSlug: string): string => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/event/${eventSlug}`;
};

/**
 * Hash password for storage (if needed for password-protected events)
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export const hashEventPassword = async (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      "event-salt",
      10000,
      64,
      "sha512",
      (err, derivedKey) => {
        if (err) reject(err);
        resolve(derivedKey.toString("hex"));
      }
    );
  });
};

/**
 * Verify password for password-protected events
 * @param password - Plain text password to verify
 * @param hashedPassword - Stored hashed password
 * @returns Promise<boolean> - Whether password is correct
 */
export const verifyEventPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const hash = await hashEventPassword(password);
    return hash === hashedPassword;
  } catch (error) {
    return false;
  }
};
