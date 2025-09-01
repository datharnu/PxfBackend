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
router.post("/event/:eventId/upload", [(0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, media_1.uploadMiddleware, media_1.uploadEventMedia);
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
// Delete user's media upload
router.delete("/:mediaId", [(0, express_validator_1.param)("mediaId").isUUID().withMessage("Media ID must be a valid UUID")], customValidations_1.validate, media_1.deleteUserMedia);
exports.default = router;
