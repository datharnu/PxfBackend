"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = __importDefault(require("express"));
const event_1 = require("../controllers/event");
const customValidations_1 = require("../utils/customValidations");
const express_validator_1 = require("express-validator");
const isAuthenticated_1 = __importDefault(require("../middlewares/isAuthenticated"));
const isAdminAuthenticated_1 = __importDefault(require("../middlewares/isAdminAuthenticated")); // You'll need this
const router = express_1.default.Router();
// Public routes - no authentication required
router.get("/", [
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    (0, express_validator_1.query)("guestLimit")
        .optional()
        .isIn(["10", "100", "250", "500", "800", "1000", "CUSTOM"])
        .withMessage("Invalid guest limit"),
    (0, express_validator_1.query)("photoCapLimit")
        .optional()
        .isIn(["5", "10", "15", "20", "25", "CUSTOM"])
        .withMessage("Invalid photo capture limit"),
    (0, express_validator_1.query)("upcoming")
        .optional()
        .isBoolean()
        .withMessage("upcoming must be a boolean"),
], customValidations_1.validate, event_1.getAllEvents);
// Event access via slug (QR code/URL access)
router.post("/access/:slug", [
    (0, express_validator_1.param)("slug")
        .isLength({ min: 10, max: 50 })
        .withMessage("Invalid event slug"),
    (0, express_validator_1.body)("password")
        .optional()
        .isLength({ min: 4, max: 50 })
        .withMessage("Password must be 4-50 characters"),
], customValidations_1.validate, event_1.getEventBySlug);
router.post("/verify/:slug", [
    (0, express_validator_1.param)("slug")
        .isLength({ min: 10, max: 50 })
        .withMessage("Invalid event slug"),
    (0, express_validator_1.body)("password")
        .optional()
        .isLength({ min: 4, max: 50 })
        .withMessage("Password must be 4-50 characters"),
], customValidations_1.validate, event_1.verifyEventAccess);
router.get("/:id", [(0, express_validator_1.param)("id").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, event_1.getEventById);
// Admin-only routes - require admin authentication
router.get("/stats", isAdminAuthenticated_1.default, event_1.getEventStats);
// Protected routes - authentication required
router.use(isAuthenticated_1.default);
router.post("/", [
    (0, express_validator_1.body)("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 3, max: 200 })
        .withMessage("Title must be between 3 and 200 characters"),
    (0, express_validator_1.body)("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ min: 10, max: 2000 })
        .withMessage("Description must be between 10 and 2000 characters"),
    (0, express_validator_1.body)("eventFlyer")
        .optional()
        .isURL()
        .withMessage("Event flyer must be a valid URL"),
    (0, express_validator_1.body)("guestLimit")
        .notEmpty()
        .withMessage("Guest limit is required")
        .isIn(["10", "100", "250", "500", "800", "1000", "CUSTOM"])
        .withMessage("Guest limit must be one of: 10, 100, 250, 500, 800, 1000, CUSTOM"),
    (0, express_validator_1.body)("photoCapLimit")
        .notEmpty()
        .withMessage("Photo capture limit is required")
        .isIn(["5", "10", "15", "20", "25", "CUSTOM"])
        .withMessage("Photo capture limit must be one of: 5, 10, 15, 20, 25, CUSTOM"),
    (0, express_validator_1.body)("customGuestLimit")
        .optional({ nullable: true })
        .custom((value, { req }) => {
        if (req.body.guestLimit === "CUSTOM") {
            const num = Number(value);
            if (!Number.isInteger(num) || num <= 1000) {
                throw new Error("customGuestLimit must be an integer greater than 1000 when guestLimit is CUSTOM");
            }
        }
        return true;
    }),
    (0, express_validator_1.body)("customPhotoCapLimit")
        .optional({ nullable: true })
        .custom((value, { req }) => {
        if (req.body.photoCapLimit === "CUSTOM") {
            const num = Number(value);
            if (!Number.isInteger(num) || num <= 25) {
                throw new Error("customPhotoCapLimit must be an integer greater than 25 when photoCapLimit is CUSTOM");
            }
        }
        return true;
    }),
    // Enforce fixed pairs for create
    (0, express_validator_1.body)("photoCapLimit").custom((photoCap, { req }) => {
        const guest = req.body.guestLimit;
        if (guest === "CUSTOM" || photoCap === "CUSTOM")
            return true;
        const allowed = {
            "10": "5",
            "100": "10",
            "250": "15",
            "500": "20",
            "800": "25",
            "1000": "25",
        };
        if (allowed[guest] !== photoCap) {
            throw new Error("Invalid pairing. Allowed pairs: 10-5, 100-10, 250-15, 500-20, 800-25, 1000-25 or use CUSTOM.");
        }
        return true;
    }),
    (0, express_validator_1.body)("eventDate")
        .optional()
        .isISO8601()
        .withMessage("Event date must be a valid date")
        .custom((value) => {
        if (value && new Date(value) < new Date()) {
            throw new Error("Event date must be in the future");
        }
        return true;
    }),
    (0, express_validator_1.body)("isPasswordProtected")
        .optional()
        .isBoolean()
        .withMessage("isPasswordProtected must be a boolean"),
    (0, express_validator_1.body)("customPassword")
        .optional()
        .isLength({ min: 4, max: 50 })
        .withMessage("Custom password must be 4-50 characters"),
], customValidations_1.validate, event_1.createEvent);
router.get("/user/my-events", [
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
], customValidations_1.validate, event_1.getUserEvents);
router.put("/:id", [
    (0, express_validator_1.param)("id").isUUID().withMessage("Event ID must be a valid UUID"),
    (0, express_validator_1.body)("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Title must be between 3 and 200 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage("Description must be between 10 and 2000 characters"),
    (0, express_validator_1.body)("eventFlyer")
        .optional()
        .isURL()
        .withMessage("Event flyer must be a valid URL"),
    (0, express_validator_1.body)("guestLimit")
        .optional()
        .isIn(["10", "100", "250", "500", "800", "1000", "CUSTOM"])
        .withMessage("Guest limit must be one of: 10, 100, 250, 500, 800, 1000, CUSTOM"),
    (0, express_validator_1.body)("photoCapLimit")
        .optional()
        .isIn(["5", "10", "15", "20", "25", "CUSTOM"])
        .withMessage("Photo capture limit must be one of: 5, 10, 15, 20, 25, CUSTOM"),
    (0, express_validator_1.body)("customGuestLimit")
        .optional({ nullable: true })
        .custom((value, { req }) => {
        if (req.body.guestLimit === "CUSTOM") {
            const num = Number(value);
            if (!Number.isInteger(num) || num <= 1000) {
                throw new Error("customGuestLimit must be an integer greater than 1000 when guestLimit is CUSTOM");
            }
        }
        return true;
    }),
    (0, express_validator_1.body)("customPhotoCapLimit")
        .optional({ nullable: true })
        .custom((value, { req }) => {
        if (req.body.photoCapLimit === "CUSTOM") {
            const num = Number(value);
            if (!Number.isInteger(num) || num <= 25) {
                throw new Error("customPhotoCapLimit must be an integer greater than 25 when photoCapLimit is CUSTOM");
            }
        }
        return true;
    }),
    // Enforce fixed pairs for update
    (0, express_validator_1.body)("photoCapLimit")
        .optional()
        .custom((photoCap, { req }) => {
        const guest = req.body.guestLimit ?? req.body.guestLimitNew;
        if (guest === "CUSTOM" || photoCap === "CUSTOM" || !guest)
            return true;
        const allowed = {
            "10": "5",
            "100": "10",
            "250": "15",
            "500": "20",
            "800": "25",
            "1000": "25",
        };
        if (allowed[guest] !== photoCap) {
            throw new Error("Invalid pairing. Allowed pairs: 10-5, 100-10, 250-15, 500-20, 800-25, 1000-25 or use CUSTOM.");
        }
        return true;
    }),
    (0, express_validator_1.body)("eventDate")
        .optional()
        .isISO8601()
        .withMessage("Event date must be a valid date")
        .custom((value) => {
        if (value && new Date(value) < new Date()) {
            throw new Error("Event date must be in the future");
        }
        return true;
    }),
    (0, express_validator_1.body)("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
], customValidations_1.validate, event_1.updateEvent);
router.delete("/:id", [(0, express_validator_1.param)("id").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, event_1.deleteEvent);
exports.default = router;
