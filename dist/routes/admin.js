"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const customValidations_1 = require("../utils/customValidations");
const isAdminAuthenticated_1 = __importDefault(require("../middlewares/isAdminAuthenticated"));
const admin_1 = require("../controllers/admin");
const router = express_1.default.Router();
// Protect all admin routes
router.use(isAdminAuthenticated_1.default);
// Stats overview
router.get("/stats", admin_1.getAdminStats);
// Users management
router.get("/users", [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("search").optional().isString(),
], customValidations_1.validate, admin_1.getUsers);
router.patch("/users/:userId/toggle", [(0, express_validator_1.param)("userId").isUUID().withMessage("User ID must be a valid UUID")], customValidations_1.validate, admin_1.toggleUserActive);
// Events management
router.get("/events", [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("search").optional().isString(),
], customValidations_1.validate, admin_1.getEvents);
router.patch("/events/:eventId/toggle", [(0, express_validator_1.param)("eventId").isUUID().withMessage("Event ID must be a valid UUID")], customValidations_1.validate, admin_1.toggleEventActive);
// Payment Management
router.get("/payments", [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
], customValidations_1.validate, admin_1.getPaymentHistory);
// Media Moderation
router.get("/media", [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("mediaType").optional().isIn(["image", "video"]),
], customValidations_1.validate, admin_1.getMediaForModeration);
router.patch("/media/:mediaId/moderate", [
    (0, express_validator_1.param)("mediaId").isUUID().withMessage("Media ID must be a valid UUID"),
    (0, express_validator_1.body)("action")
        .isIn(["approve", "reject", "delete"])
        .withMessage("Action must be approve, reject, or delete"),
], customValidations_1.validate, admin_1.moderateMedia);
exports.default = router;
