"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const faceManagement_1 = require("../controllers/faceManagement");
const isAuthenticated_1 = __importDefault(require("../middlewares/isAuthenticated"));
const router = express_1.default.Router();
// Test Azure Face API connection
router.get("/test", faceManagement_1.testAzureFaceAPI);
// Face enrollment routes
router.post("/events/:eventId/enroll", isAuthenticated_1.default, faceManagement_1.enrollUserFace);
router.get("/events/:eventId/profile", isAuthenticated_1.default, faceManagement_1.getUserFaceProfile);
router.delete("/events/:eventId/profile", isAuthenticated_1.default, faceManagement_1.deleteUserFaceProfile);
// Face detection statistics (admin/event creator only)
router.get("/events/:eventId/stats", isAuthenticated_1.default, faceManagement_1.getFaceDetectionStats);
// Face profiles management (admin/event creator only)
router.get("/events/:eventId/profiles", isAuthenticated_1.default, faceManagement_1.getEventFaceProfiles);
// Media face detections
router.get("/media/:mediaId/faces", isAuthenticated_1.default, faceManagement_1.getMediaFaceDetections);
exports.default = router;
