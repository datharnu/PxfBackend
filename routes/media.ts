import express from "express";
import { body, param, query } from "express-validator";
import { validate } from "../utils/customValidations";
import isUserAuthenticated from "../middlewares/isAuthenticated";
import {
  // uploadEventMedia,
  getEventMedia,
  getUserEventUploads,
  getEventUploadStats,
  getEventParticipantsWithUploads,
  getEventUserUploads,
  deleteUserMedia,
  getEventMediaBySlug,
  uploadMiddleware,
  submitCloudinaryMedia,
  getCloudinarySignature,
} from "../controllers/media";

const router = express.Router();

// Public routes - no authentication required
// Get event media by slug (for public access)
router.get(
  "/event/:slug",
  [
    param("slug")
      .isLength({ min: 10, max: 50 })
      .withMessage("Invalid event slug"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("mediaType")
      .optional()
      .isIn(["image", "video"])
      .withMessage("Media type must be either 'image' or 'video'"),
  ],
  validate,
  getEventMediaBySlug
);

// Protected routes - authentication required
router.use(isUserAuthenticated);

// Upload media to event
// router.post(
//   "/event/:eventId/upload",
//   [param("eventId").isUUID().withMessage("Event ID must be a valid UUID")],
//   validate,
//   uploadMiddleware,
//   uploadEventMedia
// );

// Get Cloudinary signature (for frontend authentication)
router.get(
  "/event/:eventId/cloudinary-signature",
  [param("eventId").isUUID().withMessage("Event ID must be a valid UUID")],
  validate,
  getCloudinarySignature
);

// Submit media URLs after Cloudinary upload (MAIN UPLOAD METHOD)
router.post(
  "/event/:eventId/submit-media",
  [
    param("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    body("mediaUrls").isArray().withMessage("Media URLs must be an array"),
    body("mediaUrls.*.url").isURL().withMessage("Invalid media URL"),
    body("mediaUrls.*.fileName").notEmpty().withMessage("File name required"),
    body("mediaUrls.*.fileSize")
      .isNumeric()
      .withMessage("File size must be numeric"),
    body("mediaUrls.*.mimeType").notEmpty().withMessage("MIME type required"),
    body("mediaUrls.*.publicId")
      .notEmpty()
      .withMessage("Cloudinary public ID required"),
  ],
  validate,
  submitCloudinaryMedia
);

// Get all media for an event
router.get(
  "/event/:eventId",
  [
    param("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("mediaType")
      .optional()
      .isIn(["image", "video"])
      .withMessage("Media type must be either 'image' or 'video'"),
    query("uploadedBy")
      .optional()
      .isUUID()
      .withMessage("Uploaded by must be a valid UUID"),
  ],
  validate,
  getEventMedia
);

// Get user's uploads for an event
router.get(
  "/event/:eventId/my-uploads",
  [param("eventId").isUUID().withMessage("Event ID must be a valid UUID")],
  validate,
  getUserEventUploads
);

// Get upload statistics for an event
router.get(
  "/event/:eventId/stats",
  [param("eventId").isUUID().withMessage("Event ID must be a valid UUID")],
  validate,
  getEventUploadStats
);

// List participants with their uploads for an event
router.get(
  "/event/:eventId/participants",
  [
    param("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  validate,
  getEventParticipantsWithUploads
);

// Get all uploads for a specific user in an event
router.get(
  "/event/:eventId/user/:userId",
  [
    param("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    param("userId").isUUID().withMessage("User ID must be a valid UUID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("mediaType")
      .optional()
      .isIn(["image", "video"])
      .withMessage("Media type must be either 'image' or 'video'"),
  ],
  validate,
  getEventUserUploads
);

// Delete user's media upload
router.delete(
  "/:mediaId",
  [param("mediaId").isUUID().withMessage("Media ID must be a valid UUID")],
  validate,
  deleteUserMedia
);

export default router;
