"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const customValidations_1 = require("../utils/customValidations");
const isAuthenticated_1 = __importDefault(require("../middlewares/isAuthenticated"));
const media_1 = require("../controllers/media");
const router = express_1.default.Router();
// Public routes - no authentication required
// Get event media by slug (for public access)
router.get("/event/:slug", [
    (0, express_validator_1.param)("slug")
        .isLength({ min: 10, max: 50 })
        .withMessage("Invalid event slug"),
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("mediaType")
        .optional()
        .isIn(["image", "video"])
        .withMessage("Media type must be either 'image' or 'video'"),
], customValidations_1.validate, media_1.getEventMediaBySlug);
// Protected routes - authentication required
router.use(isAuthenticated_1.default);
// Upload media to event
// router.post(
//   "/event/:eventId/upload",
//   [param("eventId").isUUID().withMessage("Event ID must be a valid UUID")],
//   validate,
//   uploadMiddleware,
//   uploadEventMedia
// );
// Get Cloudinary signature (for frontend authentication)
router.get("/event/:eventId/cloudinary-signature", [(0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, media_1.getCloudinarySignature);
// Submit media URLs after Cloudinary upload (LEGACY - DEPRECATED)
router.post("/event/:eventId/submit-media", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.body)("mediaUrls").isArray().withMessage("Media URLs must be an array"),
    (0, express_validator_1.body)("mediaUrls.*.url").isURL().withMessage("Invalid media URL"),
    (0, express_validator_1.body)("mediaUrls.*.fileName").notEmpty().withMessage("File name required"),
    (0, express_validator_1.body)("mediaUrls.*.fileSize")
        .isNumeric()
        .withMessage("File size must be numeric"),
    (0, express_validator_1.body)("mediaUrls.*.mimeType").notEmpty().withMessage("MIME type required"),
    (0, express_validator_1.body)("mediaUrls.*.publicId")
        .notEmpty()
        .withMessage("Cloudinary public ID required"),
], customValidations_1.validate, media_1.submitCloudinaryMedia);
// ===== NEW S3-BASED UPLOAD ROUTES =====
// Get S3 presigned URL for event flyer upload
router.post("/event-flyer/s3-presigned-url", [
    (0, express_validator_1.body)("fileName").notEmpty().withMessage("File name is required"),
    (0, express_validator_1.body)("mimeType").notEmpty().withMessage("MIME type is required"),
    (0, express_validator_1.body)("eventId")
        .optional()
        .isUUID()
        .withMessage("Event ID must be a valid UUID"),
], customValidations_1.validate, media_1.getEventFlyerS3PresignedUrl);
// Get S3 presigned URL for direct upload (RECOMMENDED METHOD)
router.post("/event/:eventId/s3-presigned-url", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.body)("fileName").notEmpty().withMessage("File name is required"),
    (0, express_validator_1.body)("mimeType").notEmpty().withMessage("MIME type is required"),
], customValidations_1.validate, media_1.getS3PresignedUrl);
// Submit media URLs after S3 upload (NEW MAIN UPLOAD METHOD)
router.post("/event/:eventId/submit-s3-media", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.body)("mediaUrls").isArray().withMessage("Media URLs must be an array"),
    (0, express_validator_1.body)("mediaUrls.*.url").isURL().withMessage("Invalid media URL"),
    (0, express_validator_1.body)("mediaUrls.*.fileName").notEmpty().withMessage("File name required"),
    (0, express_validator_1.body)("mediaUrls.*.fileSize")
        .isNumeric()
        .withMessage("File size must be numeric"),
    (0, express_validator_1.body)("mediaUrls.*.mimeType").notEmpty().withMessage("MIME type required"),
    (0, express_validator_1.body)("mediaUrls.*.s3Key").notEmpty().withMessage("S3 key is required"),
], customValidations_1.validate, media_1.submitS3Media);
// Get all media for an event
router.get("/event/:eventId", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("mediaType")
        .optional()
        .isIn(["image", "video"])
        .withMessage("Media type must be either 'image' or 'video'"),
    (0, express_validator_1.query)("uploadedBy")
        .optional()
        .isUUID()
        .withMessage("Uploaded by must be a valid UUID"),
], customValidations_1.validate, media_1.getEventMedia);
// Get user's uploads for an event
router.get("/event/:eventId/my-uploads", [(0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, media_1.getUserEventUploads);
// Get upload statistics for an event
router.get("/event/:eventId/stats", [(0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, media_1.getEventUploadStats);
// List participants with their uploads for an event
router.get("/event/:eventId/participants", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
], customValidations_1.validate, media_1.getEventParticipantsWithUploads);
// Get all uploads for a specific user in an event
router.get("/event/:eventId/user/:userId", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.param)("userId").isUUID().withMessage("User ID must be a valid UUID"),
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("mediaType")
        .optional()
        .isIn(["image", "video"])
        .withMessage("Media type must be either 'image' or 'video'"),
], customValidations_1.validate, media_1.getEventUserUploads);
// Delete user's media upload
router.delete("/:mediaId", [(0, express_validator_1.param)("mediaId").isUUID().withMessage("Media ID must be a valid UUID")], customValidations_1.validate, media_1.deleteUserMedia);
// Face detection and filtering routes
// Get media filtered by user's face detection
router.get("/event/:eventId/my-faces", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("similarityThreshold")
        .optional()
        .isFloat({ min: 0.1, max: 1.0 })
        .withMessage("Similarity threshold must be between 0.1 and 1.0"),
], customValidations_1.validate, media_1.getMediaWithUserFaces);
// Alternative route for face-filtered media (matches your frontend URL)
router.get("/events/:eventId/faces", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("similarityThreshold")
        .optional()
        .isFloat({ min: 0.1, max: 1.0 })
        .withMessage("Similarity threshold must be between 0.1 and 1.0"),
], customValidations_1.validate, media_1.getMediaWithUserFaces);
// Get all face detections for an event (admin/event creator only)
router.get("/event/:eventId/face-detections", [
    (0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
], customValidations_1.validate, media_1.getEventFaceDetections);
// Get face detection statistics for an event (admin/event creator only)
router.get("/event/:eventId/face-stats", [(0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, media_1.getEventFaceStats);
// Retrain face identification for an event (admin/event creator only)
router.post("/event/:eventId/retrain-faces", [(0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, media_1.retrainFaceIdentification);
exports.default = router;
