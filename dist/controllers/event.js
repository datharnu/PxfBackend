"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEventAccess = exports.getEventBySlug = exports.getEventStats = exports.getUserEvents = exports.deleteEvent = exports.updateEvent = exports.getEventById = exports.getAllEvents = exports.createEvent = void 0;
const event_1 = __importStar(require("../models/event"));
const user_1 = __importDefault(require("../models/user"));
const eventMedia_1 = __importDefault(require("../models/eventMedia"));
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const notFound_1 = __importDefault(require("../errors/notFound"));
const unauthorized_1 = __importDefault(require("../errors/unauthorized"));
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const qrCodeGenerator_1 = require("../utils/qrCodeGenerator");
// Create a new event
const createEvent = async (req, res, next) => {
    try {
        const { title, description, eventFlyer, guestLimit, photoCapLimit, eventDate, isPasswordProtected, customPassword, customGuestLimit, customPhotoCapLimit, } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        // Input validation
        if (!title || !description || !guestLimit || !photoCapLimit) {
            throw new badRequest_1.default("Title, description, guest limit, and photo capture limit are required");
        }
        // Validate enums
        if (!Object.values(event_1.GuestLimit).includes(guestLimit)) {
            throw new badRequest_1.default("Invalid guest limit. Must be one of: 10, 100, 250, 500, 800, 1000, CUSTOM");
        }
        if (!Object.values(event_1.PhotoCapLimit).includes(photoCapLimit)) {
            throw new badRequest_1.default("Invalid photo capture limit. Must be one of: 5, 10, 15, 20, 25, CUSTOM");
        }
        // Enforce allowed pairs when not CUSTOM
        if (guestLimit !== event_1.GuestLimit.CUSTOM &&
            photoCapLimit !== event_1.PhotoCapLimit.CUSTOM) {
            const allowed = {
                [event_1.GuestLimit.TEN]: event_1.PhotoCapLimit.FIVE,
                [event_1.GuestLimit.ONE_HUNDRED]: event_1.PhotoCapLimit.TEN,
                [event_1.GuestLimit.TWO_FIFTY]: event_1.PhotoCapLimit.FIFTEEN,
                [event_1.GuestLimit.FIVE_HUNDRED]: event_1.PhotoCapLimit.TWENTY,
                [event_1.GuestLimit.EIGHT_HUNDRED]: event_1.PhotoCapLimit.TWENTY_FIVE,
                [event_1.GuestLimit.ONE_THOUSAND]: event_1.PhotoCapLimit.TWENTY_FIVE,
            };
            if (allowed[guestLimit] !== photoCapLimit) {
                throw new badRequest_1.default("Invalid pairing. Allowed pairs: 10-5, 100-10, 250-15, 500-20, 800-25, 1000-25 or use CUSTOM.");
            }
        }
        // Enforce custom values when CUSTOM is chosen
        if (guestLimit === event_1.GuestLimit.CUSTOM) {
            const num = Number(customGuestLimit);
            if (!Number.isInteger(num) || num <= 1000) {
                throw new badRequest_1.default("customGuestLimit must be an integer greater than 1000 when guestLimit is CUSTOM");
            }
        }
        if (photoCapLimit === event_1.PhotoCapLimit.CUSTOM) {
            const num = Number(customPhotoCapLimit);
            if (!Number.isInteger(num) || num <= 25) {
                throw new badRequest_1.default("customPhotoCapLimit must be an integer greater than 25 when photoCapLimit is CUSTOM");
            }
        }
        // Validate event date if provided
        if (eventDate && new Date(eventDate) < new Date()) {
            throw new badRequest_1.default("Event date must be in the future");
        }
        // Only generate slug/QR for free plan at creation time
        let eventSlug;
        let qrCodeData;
        const isFreePlan = guestLimit === event_1.GuestLimit.TEN && photoCapLimit === event_1.PhotoCapLimit.FIVE;
        if (isFreePlan) {
            eventSlug = (0, qrCodeGenerator_1.generateEventSlug)();
            qrCodeData = await (0, qrCodeGenerator_1.generateEventQRCode)(eventSlug);
        }
        // Handle password protection
        let accessPassword;
        let plainPasswordForResponse;
        if (isPasswordProtected) {
            plainPasswordForResponse = customPassword || (0, qrCodeGenerator_1.generateEventPassword)(6);
            accessPassword = await (0, qrCodeGenerator_1.hashEventPassword)(plainPasswordForResponse);
        }
        const event = await event_1.default.create({
            title,
            description,
            eventFlyer,
            guestLimit,
            photoCapLimit,
            paymentStatus: isFreePlan ? event_1.PaymentStatus.FREE : event_1.PaymentStatus.PENDING,
            planPrice: isFreePlan ? 0 : null,
            paidAt: isFreePlan ? new Date() : null,
            customGuestLimit: guestLimit === event_1.GuestLimit.CUSTOM ? Number(customGuestLimit) : null,
            customPhotoCapLimit: photoCapLimit === event_1.PhotoCapLimit.CUSTOM
                ? Number(customPhotoCapLimit)
                : null,
            eventDate: eventDate ? new Date(eventDate) : undefined,
            eventSlug,
            qrCodeData,
            accessPassword,
            isPasswordProtected: !!isPasswordProtected,
            // Free plan: active immediately; Paid plan: inactive until payment
            isActive: isFreePlan ? true : false,
            createdBy: userId,
        });
        // Fetch the created event with creator details
        const createdEvent = await event_1.default.findByPk(event.id, {
            include: [
                {
                    model: user_1.default,
                    as: "creator",
                    attributes: ["id", "fullname", "email"],
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Event created successfully",
            event: createdEvent,
            ...(isFreePlan &&
                eventSlug && {
                accessInfo: {
                    eventSlug,
                    accessUrl: (0, qrCodeGenerator_1.getEventAccessUrl)(eventSlug),
                    qrCodeData,
                    isPasswordProtected: !!isPasswordProtected,
                    ...(isPasswordProtected &&
                        plainPasswordForResponse && {
                        generatedPassword: plainPasswordForResponse,
                    }),
                },
            }),
        });
    }
    catch (error) {
        console.error("Create event error:", error);
        next(error);
    }
};
exports.createEvent = createEvent;
// Get all events with optional filtering
const getAllEvents = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, isActive, guestLimit, photoCapLimit, createdBy, upcoming, } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause
        const whereClause = {};
        if (isActive !== undefined) {
            whereClause.isActive = isActive === "true";
        }
        if (guestLimit) {
            whereClause.guestLimit = guestLimit;
        }
        if (photoCapLimit) {
            whereClause.photoCapLimit = photoCapLimit;
        }
        if (createdBy) {
            whereClause.createdBy = createdBy;
        }
        if (upcoming === "true") {
            whereClause.eventDate = {
                [sequelize_1.Op.gt]: new Date(),
            };
        }
        const { count, rows: events } = await event_1.default.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: user_1.default,
                    as: "creator",
                    attributes: ["id", "fullname", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset: offset,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Events retrieved successfully",
            events,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
            },
        });
    }
    catch (error) {
        console.error("Get events error:", error);
        next(error);
    }
};
exports.getAllEvents = getAllEvents;
// Get event by ID
const getEventById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await event_1.default.findByPk(id, {
            include: [
                {
                    model: user_1.default,
                    as: "creator",
                    attributes: ["id", "fullname", "email"],
                },
            ],
        });
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event retrieved successfully",
            event,
        });
    }
    catch (error) {
        console.error("Get event by ID error:", error);
        next(error);
    }
};
exports.getEventById = getEventById;
// Update event
const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, eventFlyer, guestLimit, photoCapLimit, eventDate, isActive, customGuestLimit, customPhotoCapLimit, } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        const event = await event_1.default.findByPk(id);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Check if user is the creator of the event
        if (event.createdBy !== userId) {
            throw new unauthorized_1.default("You can only update your own events");
        }
        // Validate enums if provided
        if (guestLimit && !Object.values(event_1.GuestLimit).includes(guestLimit)) {
            throw new badRequest_1.default("Invalid guest limit. Must be one of: 10, 100, 250, 500, 800, 1000, CUSTOM");
        }
        if (photoCapLimit &&
            !Object.values(event_1.PhotoCapLimit).includes(photoCapLimit)) {
            throw new badRequest_1.default("Invalid photo capture limit. Must be one of: 5, 10, 15, 20, 25, CUSTOM");
        }
        // Enforce allowed pairs on update when both provided and not CUSTOM
        if (guestLimit &&
            photoCapLimit &&
            guestLimit !== event_1.GuestLimit.CUSTOM &&
            photoCapLimit !== event_1.PhotoCapLimit.CUSTOM) {
            const allowed = {
                [event_1.GuestLimit.TEN]: event_1.PhotoCapLimit.FIVE,
                [event_1.GuestLimit.ONE_HUNDRED]: event_1.PhotoCapLimit.TEN,
                [event_1.GuestLimit.TWO_FIFTY]: event_1.PhotoCapLimit.FIFTEEN,
                [event_1.GuestLimit.FIVE_HUNDRED]: event_1.PhotoCapLimit.TWENTY,
                [event_1.GuestLimit.EIGHT_HUNDRED]: event_1.PhotoCapLimit.TWENTY_FIVE,
                [event_1.GuestLimit.ONE_THOUSAND]: event_1.PhotoCapLimit.TWENTY_FIVE,
            };
            if (allowed[guestLimit] !== photoCapLimit) {
                throw new badRequest_1.default("Invalid pairing. Allowed pairs: 10-5, 100-10, 250-15, 500-20, 800-25, 1000-25 or use CUSTOM.");
            }
        }
        // If switching to CUSTOM, ensure custom values
        if (guestLimit === event_1.GuestLimit.CUSTOM) {
            const num = Number(customGuestLimit);
            if (!Number.isInteger(num) || num <= 1000) {
                throw new badRequest_1.default("customGuestLimit must be an integer greater than 1000 when guestLimit is CUSTOM");
            }
        }
        if (photoCapLimit === event_1.PhotoCapLimit.CUSTOM) {
            const num = Number(customPhotoCapLimit);
            if (!Number.isInteger(num) || num <= 25) {
                throw new badRequest_1.default("customPhotoCapLimit must be an integer greater than 25 when photoCapLimit is CUSTOM");
            }
        }
        // Validate event date if provided
        if (eventDate && new Date(eventDate) < new Date()) {
            throw new badRequest_1.default("Event date must be in the future");
        }
        // Update the event
        const updatedEvent = await event.update({
            ...(title && { title }),
            ...(description && { description }),
            ...(eventFlyer !== undefined && { eventFlyer }),
            ...(guestLimit && { guestLimit }),
            ...(photoCapLimit && { photoCapLimit }),
            ...(guestLimit === event_1.GuestLimit.CUSTOM && {
                customGuestLimit: Number(customGuestLimit),
            }),
            ...(photoCapLimit === event_1.PhotoCapLimit.CUSTOM && {
                customPhotoCapLimit: Number(customPhotoCapLimit),
            }),
            ...(eventDate && { eventDate: new Date(eventDate) }),
            ...(isActive !== undefined && { isActive }),
        });
        // Fetch the updated event with creator details
        const eventWithCreator = await event_1.default.findByPk(updatedEvent.id, {
            include: [
                {
                    model: user_1.default,
                    as: "creator",
                    attributes: ["id", "fullname", "email"],
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event updated successfully",
            event: eventWithCreator,
        });
    }
    catch (error) {
        console.error("Update event error:", error);
        next(error);
    }
};
exports.updateEvent = updateEvent;
// Delete event
const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        const event = await event_1.default.findByPk(id);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Check if user is the creator of the event
        if (event.createdBy !== userId) {
            throw new unauthorized_1.default("You can only delete your own events");
        }
        await event.destroy();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete event error:", error);
        next(error);
    }
};
exports.deleteEvent = deleteEvent;
// Get user's events
const getUserEvents = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        const { page = 1, limit = 10, isActive } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        const whereClause = { createdBy: userId };
        if (isActive !== undefined) {
            whereClause.isActive = isActive === "true";
        }
        const { count, rows: events } = await event_1.default.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: user_1.default,
                    as: "creator",
                    attributes: ["id", "fullname", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset: offset,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "User events retrieved successfully",
            events,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
            },
        });
    }
    catch (error) {
        console.error("Get user events error:", error);
        next(error);
    }
};
exports.getUserEvents = getUserEvents;
// Get event statistics
const getEventStats = async (req, res, next) => {
    try {
        const totalEvents = await event_1.default.count();
        const activeEvents = await event_1.default.count({ where: { isActive: true } });
        const upcomingEvents = await event_1.default.count({
            where: {
                eventDate: {
                    [sequelize_1.Op.gt]: new Date(),
                },
                isActive: true,
            },
        });
        // Get guest limit distribution
        const guestLimitStats = await event_1.default.findAll({
            attributes: [
                "guestLimit",
                [event_1.default.sequelize.fn("COUNT", event_1.default.sequelize.col("id")), "count"],
            ],
            group: ["guestLimit"],
            raw: true,
        });
        // Get photo limit distribution
        const photoLimitStats = await event_1.default.findAll({
            attributes: [
                "photoCapLimit",
                [event_1.default.sequelize.fn("COUNT", event_1.default.sequelize.col("id")), "count"],
            ],
            group: ["photoCapLimit"],
            raw: true,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event statistics retrieved successfully",
            stats: {
                totalEvents,
                activeEvents,
                upcomingEvents,
                guestLimitDistribution: guestLimitStats,
                photoLimitDistribution: photoLimitStats,
            },
        });
    }
    catch (error) {
        console.error("Get event stats error:", error);
        next(error);
    }
};
exports.getEventStats = getEventStats;
// Access event via slug (for QR code/URL access)
const getEventBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { password } = req.body;
        const userId = req.user?.id; // Optional authentication
        const event = await event_1.default.findOne({
            where: { eventSlug: slug, isActive: true },
            include: [
                {
                    model: user_1.default,
                    as: "creator",
                    attributes: ["id", "fullname", "email"],
                },
                {
                    model: eventMedia_1.default,
                    as: "media",
                    where: { isActive: true },
                    required: false,
                    include: [
                        {
                            model: user_1.default,
                            as: "uploader",
                            attributes: ["id", "fullname"],
                        },
                    ],
                    order: [["createdAt", "DESC"]],
                    limit: 10, // Show only recent 10 media items
                },
            ],
        });
        if (!event) {
            throw new notFound_1.default("Event not found or inactive");
        }
        // Check if user is the event creator (bypass password requirement)
        const isEventCreator = userId && event.createdBy === userId;
        // Check if password is required (only if not the creator)
        if (event.isPasswordProtected && event.accessPassword && !isEventCreator) {
            if (!password) {
                return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: "Password required",
                    requiresPassword: true,
                });
            }
            const isPasswordValid = await (0, qrCodeGenerator_1.verifyEventPassword)(password, event.accessPassword);
            if (!isPasswordValid) {
                throw new badRequest_1.default("Invalid password");
            }
        }
        // Remove sensitive data from response
        const eventData = event.toJSON();
        delete eventData.accessPassword;
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event accessed successfully",
            event: {
                ...eventData,
                ...(event.eventSlug && {
                    accessUrl: (0, qrCodeGenerator_1.getEventAccessUrl)(event.eventSlug),
                }),
            },
        });
    }
    catch (error) {
        console.error("Get event by slug error:", error);
        next(error);
    }
};
exports.getEventBySlug = getEventBySlug;
// Verify event password (separate endpoint for better UX)
const verifyEventAccess = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { password } = req.body;
        const userId = req.user?.id; // Optional authentication
        const event = await event_1.default.findOne({
            where: { eventSlug: slug, isActive: true },
            attributes: [
                "id",
                "eventSlug",
                "title",
                "isPasswordProtected",
                "createdBy",
                "accessPassword",
            ],
        });
        if (!event) {
            throw new notFound_1.default("Event not found or inactive");
        }
        // Check if user is the event creator (bypass password requirement)
        const isEventCreator = userId && event.createdBy === userId;
        if (!event.isPasswordProtected) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: "Event access granted",
                requiresPassword: false,
            });
        }
        // If user is the creator, grant access without password
        if (isEventCreator) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: "Event access granted (creator)",
                requiresPassword: false,
            });
        }
        if (!password) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Password is required",
                requiresPassword: true,
            });
        }
        if (!event.accessPassword) {
            throw new badRequest_1.default("Event configuration error");
        }
        const isPasswordValid = await (0, qrCodeGenerator_1.verifyEventPassword)(password, event.accessPassword);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: isPasswordValid,
            message: isPasswordValid ? "Access granted" : "Invalid password",
            requiresPassword: !isPasswordValid,
        });
    }
    catch (error) {
        console.error("Verify event access error:", error);
        next(error);
    }
};
exports.verifyEventAccess = verifyEventAccess;
