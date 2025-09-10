import express from "express";
import { param, query, body } from "express-validator";
import { validate } from "../utils/customValidations";
import isAdminAuthenticated from "../middlewares/isAdminAuthenticated";
import {
  getUsers,
  toggleUserActive,
  getEvents,
  toggleEventActive,
  getAdminStats,
  getPaymentHistory,
  getMediaForModeration,
  moderateMedia,
} from "../controllers/admin";

const router = express.Router();

// Protect all admin routes
router.use(isAdminAuthenticated);

// Stats overview
router.get("/stats", getAdminStats);

// Users management
router.get(
  "/users",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
  ],
  validate,
  getUsers
);

router.patch(
  "/users/:userId/toggle",
  [param("userId").isUUID().withMessage("User ID must be a valid UUID")],
  validate,
  toggleUserActive
);

// Events management
router.get(
  "/events",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
  ],
  validate,
  getEvents
);

router.patch(
  "/events/:eventId/toggle",
  [param("eventId").isUUID().withMessage("Event ID must be a valid UUID")],
  validate,
  toggleEventActive
);

// Payment Management
router.get(
  "/payments",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  getPaymentHistory
);

// Media Moderation
router.get(
  "/media",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("mediaType").optional().isIn(["image", "video"]),
  ],
  validate,
  getMediaForModeration
);

router.patch(
  "/media/:mediaId/moderate",
  [
    param("mediaId").isUUID().withMessage("Media ID must be a valid UUID"),
    body("action")
      .isIn(["approve", "reject", "delete"])
      .withMessage("Action must be approve, reject, or delete"),
  ],
  validate,
  moderateMedia
);

export default router;
