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
exports.uploadMiddleware = exports.getEventMediaBySlug = exports.deleteUserMedia = exports.getEventUploadStats = exports.getUserEventUploads = exports.getEventMedia = exports.uploadEventMedia = void 0;
const http_status_codes_1 = require("http-status-codes");
const event_1 = __importDefault(require("../models/event"));
const eventMedia_1 = __importStar(require("../models/eventMedia"));
const user_1 = __importDefault(require("../models/user"));
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const notFound_1 = __importDefault(require("../errors/notFound"));
const unauthorized_1 = __importDefault(require("../errors/unauthorized"));
const fileUpload_1 = __importStar(require("../utils/fileUpload"));
// Upload media to event
const uploadEventMedia = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        if (!req.files || req.files.length === 0) {
            throw new badRequest_1.default("No files uploaded");
        }
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Check if event is active
        if (!event.isActive) {
            throw new badRequest_1.default("Event is not active");
        }
        // Get user's existing uploads for this event
        const userUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                uploadedBy: userId,
                isActive: true,
            },
        });
        // Check if user has reached their photo cap limit
        const photoCapLimit = parseInt(event.photoCapLimit);
        if (userUploads >= photoCapLimit) {
            throw new badRequest_1.default(`You have reached your upload limit of ${photoCapLimit} files for this event`);
        }
        // Check if adding new files would exceed the limit
        const filesToUpload = Array.isArray(req.files) ? req.files.length : 1;
        if (userUploads + filesToUpload > photoCapLimit) {
            throw new badRequest_1.default(`Uploading ${filesToUpload} files would exceed your limit of ${photoCapLimit}. You have ${photoCapLimit - userUploads} uploads remaining.`);
        }
        // Process uploaded files
        const uploadedFiles = Array.isArray(req.files) ? req.files : [req.files];
        const mediaRecords = [];
        for (const file of uploadedFiles) {
            const mediaType = (0, fileUpload_1.getMediaTypeFromMimeType)(file.mimetype);
            const mediaUrl = (0, fileUpload_1.getFileUrl)(eventId, file.filename);
            const mediaRecord = await eventMedia_1.default.create({
                eventId,
                uploadedBy: userId,
                mediaType,
                mediaUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
            });
            mediaRecords.push(mediaRecord);
        }
        // Get updated upload count for response
        const updatedUserUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                uploadedBy: userId,
                isActive: true,
            },
        });
        const remainingUploads = photoCapLimit - updatedUserUploads;
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Media uploaded successfully",
            uploadedMedia: mediaRecords,
            uploadStats: {
                totalUploads: updatedUserUploads,
                remainingUploads,
                photoCapLimit,
            },
        });
    }
    catch (error) {
        console.error("Upload media error:", error);
        next(error);
    }
};
exports.uploadEventMedia = uploadEventMedia;
// Get all media for an event
const getEventMedia = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20, mediaType, uploadedBy } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Build where clause
        const whereClause = {
            eventId,
            isActive: true,
        };
        if (mediaType &&
            Object.values(eventMedia_1.MediaType).includes(mediaType)) {
            whereClause.mediaType = mediaType;
        }
        if (uploadedBy) {
            whereClause.uploadedBy = uploadedBy;
        }
        const { count, rows: media } = await eventMedia_1.default.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: user_1.default,
                    as: "uploader",
                    attributes: ["id", "fullname", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset: offset,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event media retrieved successfully",
            media,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
            },
            eventInfo: {
                id: event.id,
                title: event.title,
                photoCapLimit: event.photoCapLimit,
            },
        });
    }
    catch (error) {
        console.error("Get event media error:", error);
        next(error);
    }
};
exports.getEventMedia = getEventMedia;
// Get user's uploads for an event
const getUserEventUploads = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Get user's uploads
        const userUploads = await eventMedia_1.default.findAll({
            where: {
                eventId,
                uploadedBy: userId,
                isActive: true,
            },
            order: [["createdAt", "DESC"]],
        });
        // Get upload statistics
        const totalUploads = userUploads.length;
        const photoCapLimit = parseInt(event.photoCapLimit);
        const remainingUploads = photoCapLimit - totalUploads;
        // Group by media type
        const uploadsByType = userUploads.reduce((acc, upload) => {
            const type = upload.mediaType;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(upload);
            return acc;
        }, {});
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "User uploads retrieved successfully",
            uploads: userUploads,
            uploadsByType,
            stats: {
                totalUploads,
                remainingUploads,
                photoCapLimit,
                imagesCount: uploadsByType[eventMedia_1.MediaType.IMAGE]?.length || 0,
                videosCount: uploadsByType[eventMedia_1.MediaType.VIDEO]?.length || 0,
            },
        });
    }
    catch (error) {
        console.error("Get user uploads error:", error);
        next(error);
    }
};
exports.getUserEventUploads = getUserEventUploads;
// Get upload statistics for an event
const getEventUploadStats = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Get total uploads for the event
        const totalUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                isActive: true,
            },
        });
        // Get uploads by type
        const uploadsByType = await eventMedia_1.default.findAll({
            where: {
                eventId,
                isActive: true,
            },
            attributes: [
                "mediaType",
                [
                    eventMedia_1.default.sequelize.fn("COUNT", eventMedia_1.default.sequelize.col("id")),
                    "count",
                ],
            ],
            group: ["mediaType"],
            raw: true,
        });
        // Get unique participants (uploaders) count
        const uniqueParticipants = await eventMedia_1.default.count({
            where: {
                eventId,
                isActive: true,
            },
            distinct: true,
            col: "uploadedBy",
        });
        // Get participant details with their upload counts
        const participants = await eventMedia_1.default.findAll({
            where: {
                eventId,
                isActive: true,
            },
            attributes: [
                "uploadedBy",
                [
                    eventMedia_1.default.sequelize.fn("COUNT", eventMedia_1.default.sequelize.col("id")),
                    "uploadCount",
                ],
                [
                    eventMedia_1.default.sequelize.fn("SUM", eventMedia_1.default.sequelize.col("fileSize")),
                    "totalFileSize",
                ],
            ],
            include: [
                {
                    model: user_1.default,
                    as: "uploader",
                    attributes: ["id", "fullname", "email"],
                },
            ],
            group: [
                "uploadedBy",
                "uploader.id",
                "uploader.fullname",
                "uploader.email",
            ],
            order: [
                [
                    eventMedia_1.default.sequelize.fn("COUNT", eventMedia_1.default.sequelize.col("id")),
                    "DESC",
                ],
            ],
            raw: true,
            nest: true,
        });
        // Get recent uploads (last 10)
        const recentUploads = await eventMedia_1.default.findAll({
            where: {
                eventId,
                isActive: true,
            },
            include: [
                {
                    model: user_1.default,
                    as: "uploader",
                    attributes: ["id", "fullname"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 10,
        });
        // Calculate total file size
        const totalFileSize = await eventMedia_1.default.sum("fileSize", {
            where: {
                eventId,
                isActive: true,
            },
        });
        // Calculate photos and videos count
        const photosCount = uploadsByType.find((item) => item.mediaType === eventMedia_1.MediaType.IMAGE)?.count || "0";
        const videosCount = uploadsByType.find((item) => item.mediaType === eventMedia_1.MediaType.VIDEO)?.count || "0";
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event upload statistics retrieved successfully",
            stats: {
                totalUploads,
                uniqueParticipants,
                totalFileSize: totalFileSize || 0,
                photosCount: parseInt(photosCount),
                videosCount: parseInt(videosCount),
                uploadsByType: uploadsByType.reduce((acc, item) => {
                    acc[item.mediaType] = parseInt(item.count);
                    return acc;
                }, {}),
                participants,
                recentUploads,
                eventInfo: {
                    id: event.id,
                    title: event.title,
                    photoCapLimit: event.photoCapLimit,
                    guestLimit: event.guestLimit,
                },
            },
        });
    }
    catch (error) {
        console.error("Get upload stats error:", error);
        next(error);
    }
};
exports.getEventUploadStats = getEventUploadStats;
// Delete user's media upload
const deleteUserMedia = async (req, res, next) => {
    try {
        const { mediaId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        // Find the media record
        const media = await eventMedia_1.default.findByPk(mediaId);
        if (!media) {
            throw new notFound_1.default("Media not found");
        }
        // Check if user owns the media
        if (media.uploadedBy !== userId) {
            // If not the uploader, check if they're the event creator
            const event = await event_1.default.findByPk(media.eventId);
            if (!event || event.createdBy !== userId) {
                throw new unauthorized_1.default("You can only delete your own uploads");
            }
        }
        // Soft delete the media
        await media.update({ isActive: false });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Media deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete media error:", error);
        next(error);
    }
};
exports.deleteUserMedia = deleteUserMedia;
// Get media by slug (for public access)
const getEventMediaBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 20, mediaType } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        // Find the event by slug
        const event = await event_1.default.findOne({
            where: { eventSlug: slug, isActive: true },
        });
        if (!event) {
            throw new notFound_1.default("Event not found or inactive");
        }
        // Build where clause
        const whereClause = {
            eventId: event.id,
            isActive: true,
        };
        if (mediaType &&
            Object.values(eventMedia_1.MediaType).includes(mediaType)) {
            whereClause.mediaType = mediaType;
        }
        const { count, rows: media } = await eventMedia_1.default.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: user_1.default,
                    as: "uploader",
                    attributes: ["id", "fullname"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset: offset,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event media retrieved successfully",
            media,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
            },
            eventInfo: {
                id: event.id,
                title: event.title,
                photoCapLimit: event.photoCapLimit,
            },
        });
    }
    catch (error) {
        console.error("Get event media by slug error:", error);
        next(error);
    }
};
exports.getEventMediaBySlug = getEventMediaBySlug;
// Middleware to handle file upload
exports.uploadMiddleware = fileUpload_1.default.array("media", 10);
