import express from "express";
import { param, query } from "express-validator";
import { validate } from "../utils/customValidations";
import isUserAuthenticated from "../middlewares/isAuthenticated";
import {
  uploadEventMedia,
  getEventMedia,
  getUserEventUploads,
  getEventUploadStats,
  deleteUserMedia,
  getEventMediaBySlug,
  uploadMiddleware,
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
router.post(
  "/event/:eventId/upload",
  [param("eventId").isUUID().withMessage("Event ID must be a valid UUID")],
  validate,
  uploadMiddleware,
  uploadEventMedia
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

// Delete user's media upload
router.delete(
  "/:mediaId",
  [param("mediaId").isUUID().withMessage("Media ID must be a valid UUID")],
  validate,
  deleteUserMedia
);

export default router;
