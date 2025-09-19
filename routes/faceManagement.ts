import express from "express";
import multer from "multer";
import {
  testGoogleVisionAPI,
  debugFaceDetections,
  enrollUserFace,
  getUserFaceProfile,
  deleteUserFaceProfile,
  getFaceDetectionStats,
  getEventFaceProfiles,
  getMediaFaceDetections,
} from "../controllers/faceManagement";
import isUserAuthenticated from "../middlewares/isAuthenticated";

// Configure multer for face image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for images (matching frontend)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG and PNG images are allowed."));
    }
  },
});

const router = express.Router();

// Test Google Vision API connection
router.get("/test", testGoogleVisionAPI);

// Debug face detections
router.get("/events/:eventId/debug", isUserAuthenticated, debugFaceDetections);

// Face enrollment routes
router.post(
  "/events/:eventId/enroll",
  isUserAuthenticated,
  upload.single("faceImage"),
  enrollUserFace
);
router.get("/events/:eventId/profile", isUserAuthenticated, getUserFaceProfile);
router.delete(
  "/events/:eventId/profile",
  isUserAuthenticated,
  deleteUserFaceProfile
);

// Face detection statistics (admin/event creator only)
router.get(
  "/events/:eventId/stats",
  isUserAuthenticated,
  getFaceDetectionStats
);

// Face profiles management (admin/event creator only)
router.get(
  "/events/:eventId/profiles",
  isUserAuthenticated,
  getEventFaceProfiles
);

// Media face detections
router.get(
  "/media/:mediaId/faces",
  isUserAuthenticated,
  getMediaFaceDetections
);

export default router;
