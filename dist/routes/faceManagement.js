"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const faceManagement_1 = require("../controllers/faceManagement");
const isAuthenticated_1 = __importDefault(require("../middlewares/isAuthenticated"));
// Configure multer for face image uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 50MB limit for images (matching frontend)
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
exports.default = router;
