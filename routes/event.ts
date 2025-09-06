// import express from "express";
// import {
//   createEvent,
//   getAllEvents,
//   getEventById,
//   updateEvent,
//   deleteEvent,
//   getUserEvents,
//   getEventStats,
//   getEventBySlug,
//   verifyEventAccess,
// } from "../controllers/event";
// import { eventValidationRules, validate } from "../utils/customValidations";
// import { body, param, query } from "express-validator";
// import isUserAuthenticated from "../middlewares/isAuthenticated";

// const router = express.Router();

// // Public routes - no authentication required
// router.get(
//   "/",
//   [
//     query("page")
//       .optional()
//       .isInt({ min: 1 })
//       .withMessage("Page must be a positive integer"),
//     query("limit")
//       .optional()
//       .isInt({ min: 1, max: 100 })
//       .withMessage("Limit must be between 1 and 100"),
//     query("isActive")
//       .optional()
//       .isBoolean()
//       .withMessage("isActive must be a boolean"),
//     query("guestLimit")
//       .optional()
//       .isIn(["10", "100", "250", "500", "800", "1000+"])
//       .withMessage("Invalid guest limit"),
//     query("photoCapLimit")
//       .optional()
//       .isIn(["5", "10", "15", "20", "25"])
//       .withMessage("Invalid photo capture limit"),
//     query("upcoming")
//       .optional()
//       .isBoolean()
//       .withMessage("upcoming must be a boolean"),
//   ],
//   validate,
//   getAllEvents
// );

// router.get("/stats", getEventStats);

// // Event access via slug (QR code/URL access)
// router.post(
//   "/access/:slug",
//   [
//     param("slug")
//       .isLength({ min: 10, max: 50 })
//       .withMessage("Invalid event slug"),
//     body("password")
//       .optional()
//       .isLength({ min: 4, max: 50 })
//       .withMessage("Password must be 4-50 characters"),
//   ],
//   validate,
//   getEventBySlug
// );

// router.post(
//   "/verify/:slug",
//   [
//     param("slug")
//       .isLength({ min: 10, max: 50 })
//       .withMessage("Invalid event slug"),
//     body("password")
//       .optional()
//       .isLength({ min: 4, max: 50 })
//       .withMessage("Password must be 4-50 characters"),
//   ],
//   validate,
//   verifyEventAccess
// );

// router.get(
//   "/:id",
//   [param("id").isUUID().withMessage("Event ID must be a valid UUID")],
//   validate,
//   getEventById
// );

// // Protected routes - authentication required
// router.use(isUserAuthenticated);

// router.post(
//   "/",
//   [
//     body("title")
//       .trim()
//       .notEmpty()
//       .withMessage("Title is required")
//       .isLength({ min: 3, max: 200 })
//       .withMessage("Title must be between 3 and 200 characters"),
//     body("description")
//       .trim()
//       .notEmpty()
//       .withMessage("Description is required")
//       .isLength({ min: 10, max: 2000 })
//       .withMessage("Description must be between 10 and 2000 characters"),
//     body("eventFlyer")
//       .optional()
//       .isURL()
//       .withMessage("Event flyer must be a valid URL"),
//     body("guestLimit")
//       .notEmpty()
//       .withMessage("Guest limit is required")
//       .isIn(["10", "100", "250", "500", "800", "1000+"])
//       .withMessage("Guest limit must be one of: 10, 100, 250, 500, 800, 1000+"),
//     body("photoCapLimit")
//       .notEmpty()
//       .withMessage("Photo capture limit is required")
//       .isIn(["5", "10", "15", "20", "25"])
//       .withMessage("Photo capture limit must be one of: 5, 10, 15, 20, 25"),
//     body("eventDate")
//       .optional()
//       .isISO8601()
//       .withMessage("Event date must be a valid date")
//       .custom((value) => {
//         if (value && new Date(value) < new Date()) {
//           throw new Error("Event date must be in the future");
//         }
//         return true;
//       }),
//     body("isPasswordProtected")
//       .optional()
//       .isBoolean()
//       .withMessage("isPasswordProtected must be a boolean"),
//     body("customPassword")
//       .optional()
//       .isLength({ min: 4, max: 50 })
//       .withMessage("Custom password must be 4-50 characters"),
//   ],
//   validate,
//   createEvent
// );

// router.get(
//   "/user/my-events",
//   [
//     query("page")
//       .optional()
//       .isInt({ min: 1 })
//       .withMessage("Page must be a positive integer"),
//     query("limit")
//       .optional()
//       .isInt({ min: 1, max: 100 })
//       .withMessage("Limit must be between 1 and 100"),
//     query("isActive")
//       .optional()
//       .isBoolean()
//       .withMessage("isActive must be a boolean"),
//   ],
//   validate,
//   getUserEvents
// );

// router.put(
//   "/:id",
//   [
//     param("id").isUUID().withMessage("Event ID must be a valid UUID"),
//     body("title")
//       .optional()
//       .trim()
//       .isLength({ min: 3, max: 200 })
//       .withMessage("Title must be between 3 and 200 characters"),
//     body("description")
//       .optional()
//       .trim()
//       .isLength({ min: 10, max: 2000 })
//       .withMessage("Description must be between 10 and 2000 characters"),
//     body("eventFlyer")
//       .optional()
//       .isURL()
//       .withMessage("Event flyer must be a valid URL"),
//     body("guestLimit")
//       .optional()
//       .isIn(["10", "100", "250", "500", "800", "1000+"])
//       .withMessage("Guest limit must be one of: 10, 100, 250, 500, 800, 1000+"),
//     body("photoCapLimit")
//       .optional()
//       .isIn(["5", "10", "15", "20", "25"])
//       .withMessage("Photo capture limit must be one of: 5, 10, 15, 20, 25"),
//     body("eventDate")
//       .optional()
//       .isISO8601()
//       .withMessage("Event date must be a valid date")
//       .custom((value) => {
//         if (value && new Date(value) < new Date()) {
//           throw new Error("Event date must be in the future");
//         }
//         return true;
//       }),

//     body("isActive")
//       .optional()
//       .isBoolean()
//       .withMessage("isActive must be a boolean"),
//   ],
//   validate,
//   updateEvent
// );

// router.delete(
//   "/:id",
//   [param("id").isUUID().withMessage("Event ID must be a valid UUID")],
//   validate,
//   deleteEvent
// );

// export default router;

import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getUserEvents,
  getEventStats,
  getEventBySlug,
  verifyEventAccess,
} from "../controllers/event";
import { eventValidationRules, validate } from "../utils/customValidations";
import { body, param, query } from "express-validator";
import isUserAuthenticated from "../middlewares/isAuthenticated";
import isAdminAuthenticated from "../middlewares/isAdminAuthenticated"; // You'll need this

const router = express.Router();

// Public routes - no authentication required
router.get(
  "/",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    query("guestLimit")
      .optional()
      .isIn(["10", "100", "250", "500", "800", "1000", "CUSTOM"])
      .withMessage("Invalid guest limit"),
    query("photoCapLimit")
      .optional()
      .isIn(["5", "10", "15", "20", "25", "CUSTOM"])
      .withMessage("Invalid photo capture limit"),
    query("upcoming")
      .optional()
      .isBoolean()
      .withMessage("upcoming must be a boolean"),
  ],
  validate,
  getAllEvents
);

// Event access via slug (QR code/URL access)
router.post(
  "/access/:slug",
  [
    param("slug")
      .isLength({ min: 10, max: 50 })
      .withMessage("Invalid event slug"),
    body("password")
      .optional()
      .isLength({ min: 4, max: 50 })
      .withMessage("Password must be 4-50 characters"),
  ],
  validate,
  getEventBySlug
);

router.post(
  "/verify/:slug",
  [
    param("slug")
      .isLength({ min: 10, max: 50 })
      .withMessage("Invalid event slug"),
    body("password")
      .optional()
      .isLength({ min: 4, max: 50 })
      .withMessage("Password must be 4-50 characters"),
  ],
  validate,
  verifyEventAccess
);

router.get(
  "/:id",
  [param("id").isUUID().withMessage("Event ID must be a valid UUID")],
  validate,
  getEventById
);

// Admin-only routes - require admin authentication
router.get("/stats", isAdminAuthenticated, getEventStats);

// Protected routes - authentication required
router.use(isUserAuthenticated);

router.post(
  "/",
  [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3, max: 200 })
      .withMessage("Title must be between 3 and 200 characters"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("eventFlyer")
      .optional()
      .isURL()
      .withMessage("Event flyer must be a valid URL"),
    body("guestLimit")
      .notEmpty()
      .withMessage("Guest limit is required")
      .isIn(["10", "100", "250", "500", "800", "1000", "CUSTOM"])
      .withMessage(
        "Guest limit must be one of: 10, 100, 250, 500, 800, 1000, CUSTOM"
      ),
    body("photoCapLimit")
      .notEmpty()
      .withMessage("Photo capture limit is required")
      .isIn(["5", "10", "15", "20", "25", "CUSTOM"])
      .withMessage(
        "Photo capture limit must be one of: 5, 10, 15, 20, 25, CUSTOM"
      ),
    body("customGuestLimit")
      .optional({ nullable: true })
      .custom((value, { req }) => {
        if (req.body.guestLimit === "CUSTOM") {
          const num = Number(value);
          if (!Number.isInteger(num) || num <= 1000) {
            throw new Error(
              "customGuestLimit must be an integer greater than 1000 when guestLimit is CUSTOM"
            );
          }
        }
        return true;
      }),
    body("customPhotoCapLimit")
      .optional({ nullable: true })
      .custom((value, { req }) => {
        if (req.body.photoCapLimit === "CUSTOM") {
          const num = Number(value);
          if (!Number.isInteger(num) || num <= 25) {
            throw new Error(
              "customPhotoCapLimit must be an integer greater than 25 when photoCapLimit is CUSTOM"
            );
          }
        }
        return true;
      }),
    // Enforce fixed pairs for create
    body("photoCapLimit").custom((photoCap, { req }) => {
      const guest = req.body.guestLimit;
      if (guest === "CUSTOM" || photoCap === "CUSTOM") return true;
      const allowed = {
        "10": "5",
        "100": "10",
        "250": "15",
        "500": "20",
        "800": "25",
        "1000": "25",
      } as Record<string, string>;
      if (allowed[guest] !== photoCap) {
        throw new Error(
          "Invalid pairing. Allowed pairs: 10-5, 100-10, 250-15, 500-20, 800-25, 1000-25 or use CUSTOM."
        );
      }
      return true;
    }),
    body("eventDate")
      .optional()
      .isISO8601()
      .withMessage("Event date must be a valid date")
      .custom((value) => {
        if (value) {
          const date = new Date(value);
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (date < todayStart) {
            throw new Error("Event date cannot be in the past");
          }
        }
        return true;
      }),
    body("isPasswordProtected")
      .optional()
      .isBoolean()
      .withMessage("isPasswordProtected must be a boolean"),
    body("customPassword")
      .optional()
      .isLength({ min: 4, max: 50 })
      .withMessage("Custom password must be 4-50 characters"),
  ],
  validate,
  createEvent
);

router.get(
  "/user/my-events",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  validate,
  getUserEvents
);

router.put(
  "/:id",
  [
    param("id").isUUID().withMessage("Event ID must be a valid UUID"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Title must be between 3 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("eventFlyer")
      .optional()
      .isURL()
      .withMessage("Event flyer must be a valid URL"),
    body("guestLimit")
      .optional()
      .isIn(["10", "100", "250", "500", "800", "1000", "CUSTOM"])
      .withMessage(
        "Guest limit must be one of: 10, 100, 250, 500, 800, 1000, CUSTOM"
      ),
    body("photoCapLimit")
      .optional()
      .isIn(["5", "10", "15", "20", "25", "CUSTOM"])
      .withMessage(
        "Photo capture limit must be one of: 5, 10, 15, 20, 25, CUSTOM"
      ),
    body("customGuestLimit")
      .optional({ nullable: true })
      .custom((value, { req }) => {
        if (req.body.guestLimit === "CUSTOM") {
          const num = Number(value);
          if (!Number.isInteger(num) || num <= 1000) {
            throw new Error(
              "customGuestLimit must be an integer greater than 1000 when guestLimit is CUSTOM"
            );
          }
        }
        return true;
      }),
    body("customPhotoCapLimit")
      .optional({ nullable: true })
      .custom((value, { req }) => {
        if (req.body.photoCapLimit === "CUSTOM") {
          const num = Number(value);
          if (!Number.isInteger(num) || num <= 25) {
            throw new Error(
              "customPhotoCapLimit must be an integer greater than 25 when photoCapLimit is CUSTOM"
            );
          }
        }
        return true;
      }),
    // Enforce fixed pairs for update
    body("photoCapLimit")
      .optional()
      .custom((photoCap, { req }) => {
        const guest = req.body.guestLimit ?? req.body.guestLimitNew;
        if (guest === "CUSTOM" || photoCap === "CUSTOM" || !guest) return true;
        const allowed = {
          "10": "5",
          "100": "10",
          "250": "15",
          "500": "20",
          "800": "25",
          "1000": "25",
        } as Record<string, string>;
        if (allowed[guest] !== photoCap) {
          throw new Error(
            "Invalid pairing. Allowed pairs: 10-5, 100-10, 250-15, 500-20, 800-25, 1000-25 or use CUSTOM."
          );
        }
        return true;
      }),
    body("eventDate")
      .optional()
      .isISO8601()
      .withMessage("Event date must be a valid date")
      .custom((value) => {
        if (value) {
          const date = new Date(value);
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (date < todayStart) {
            throw new Error("Event date cannot be in the past");
          }
        }
        return true;
      }),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  validate,
  updateEvent
);

router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Event ID must be a valid UUID")],
  validate,
  deleteEvent
);

export default router;
