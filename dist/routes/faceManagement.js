"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const faceManagement_1 = require("../controllers/faceManagement");
const isAuthenticated_1 = __importDefault(require("../middlewares/isAuthenticated"));
const express_validator_1 = require("express-validator");
const customValidations_1 = require("../utils/customValidations");
// Configure multer for face image uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 104857600, // 100MB = 100 * 1024 * 1024 bytes (explicitly set)
        fieldSize: 104857600, // 100MB limit for field values
        files: 1, // Only allow 1 file at a time for face enrollment
        parts: 1000, // Increase parts limit for large files
        fieldNameSize: 100, // Max field name size
        headerPairs: 2000, // Max header pairs
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Invalid file type. Only JPEG and PNG images are allowed."));
        }
    },
});
const router = express_1.default.Router();
// Test Google Vision API connection
router.get("/test", faceManagement_1.testGoogleVisionAPI);
// Test face detection with specific image URL
router.post("/test-face-detection", [(0, express_validator_1.body)("imageUrl").notEmpty().withMessage("Image URL is required")], customValidations_1.validate, faceManagement_1.testFaceDetection);
// Test S3 URL accessibility
router.post("/test-s3-access", [(0, express_validator_1.body)("imageUrl").notEmpty().withMessage("Image URL is required")], customValidations_1.validate, faceManagement_1.testS3UrlAccess);
// Debug face detections
router.get("/events/:eventId/debug", isAuthenticated_1.default, faceManagement_1.debugFaceDetections);
// Face enrollment routes
router.post("/events/:eventId/enroll", isAuthenticated_1.default, upload.single("faceImage"), faceManagement_1.enrollUserFace);
router.get("/events/:eventId/profile", isAuthenticated_1.default, faceManagement_1.getUserFaceProfile);
router.delete("/events/:eventId/profile", isAuthenticated_1.default, faceManagement_1.deleteUserFaceProfile);
// Face detection statistics (admin/event creator only)
router.get("/events/:eventId/stats", isAuthenticated_1.default, faceManagement_1.getFaceDetectionStats);
// Face profiles management (admin/event creator only)
router.get("/events/:eventId/profiles", isAuthenticated_1.default, faceManagement_1.getEventFaceProfiles);
// Media face detections
router.get("/media/:mediaId/faces", isAuthenticated_1.default, faceManagement_1.getMediaFaceDetections);
// Face enrollment S3 presigned URL routes
router.post("/events/:eventId/s3-presigned-url", isAuthenticated_1.default, [
    (0, express_validator_1.body)("fileName").notEmpty().withMessage("File name is required"),
    (0, express_validator_1.body)("mimeType").notEmpty().withMessage("MIME type is required"),
], customValidations_1.validate, faceManagement_1.getFaceEnrollmentS3PresignedUrl);
router.post("/events/:eventId/submit-s3-enrollment", isAuthenticated_1.default, [
    (0, express_validator_1.body)("s3Key").notEmpty().withMessage("S3 key is required"),
    (0, express_validator_1.body)("fileName").notEmpty().withMessage("File name is required"),
    (0, express_validator_1.body)("mimeType").notEmpty().withMessage("MIME type is required"),
    (0, express_validator_1.body)("fileSize")
        .optional()
        .isInt({ min: 1 })
        .withMessage("File size must be a positive integer"),
], customValidations_1.validate, faceManagement_1.submitFaceEnrollmentFromS3);
exports.default = router;
