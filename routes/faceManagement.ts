import express from "express";
import {
  testAzureFaceAPI,
  debugFaceDetections,
  enrollUserFace,
  getUserFaceProfile,
  deleteUserFaceProfile,
  getFaceDetectionStats,
  getEventFaceProfiles,
  getMediaFaceDetections,
} from "../controllers/faceManagement";
import isUserAuthenticated from "../middlewares/isAuthenticated";

const router = express.Router();

// Test Azure Face API connection
router.get("/test", testAzureFaceAPI);

// Debug face detections
router.get("/events/:eventId/debug", isUserAuthenticated, debugFaceDetections);

// Face enrollment routes
router.post("/events/:eventId/enroll", isUserAuthenticated, enrollUserFace);
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
