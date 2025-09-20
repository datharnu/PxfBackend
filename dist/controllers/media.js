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
exports.getS3PresignedUrl = exports.getEventFlyerS3PresignedUrl = exports.submitS3Media = exports.uploadMiddleware = exports.retrainFaceIdentification = exports.getEventFaceStats = exports.getEventFaceDetections = exports.getMediaWithUserFaces = exports.getEventMediaBySlug = exports.deleteUserMedia = exports.getEventUserUploads = exports.getEventParticipantsWithUploads = exports.getEventUploadStats = exports.getUserEventUploads = exports.getEventMedia = exports.getCloudinarySignature = exports.submitCloudinaryMedia = void 0;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const cloudinary_1 = require("cloudinary");
const event_1 = __importDefault(require("../models/event"));
const eventMedia_1 = __importStar(require("../models/eventMedia"));
const user_1 = __importDefault(require("../models/user"));
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const notFound_1 = __importDefault(require("../errors/notFound"));
const unauthorized_1 = __importDefault(require("../errors/unauthorized"));
const fileUpload_1 = __importStar(require("../utils/fileUpload"));
const faceProcessingService_1 = __importDefault(require("../utils/faceProcessingService"));
const s3Service_1 = __importDefault(require("../utils/s3Service"));
// Helper function to get upload limits based on user role and event settings
const getUploadLimits = (event, userId) => {
    const isCreator = event.createdBy === userId;
    // Define upload limits based on guest count
    let creatorLimit = 20;
    let guestLimit = 5;
    switch (event.guestLimit) {
        case "10":
            creatorLimit = 20;
            guestLimit = 5;
            break;
        case "100":
            creatorLimit = 30;
            guestLimit = 10;
            break;
        case "250":
            creatorLimit = 50;
            guestLimit = 15;
            break;
        case "500":
            creatorLimit = 50;
            guestLimit = 20;
            break;
        case "800":
            creatorLimit = 80;
            guestLimit = 25;
            break;
        case "1000":
            creatorLimit = 80;
            guestLimit = 25;
            break;
        case "CUSTOM":
            creatorLimit = 80;
            // For custom plans, use the event's custom photo cap limit for guests
            guestLimit = event.customPhotoCapLimit || 25;
            break;
        default:
            creatorLimit = 20;
            guestLimit = 5;
    }
    return {
        isCreator,
        maxUploads: isCreator ? creatorLimit : guestLimit,
        userType: isCreator ? "creator" : "guest",
    };
};
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Upload media to event
// FAST METHOD: Submit Cloudinary URLs (Frontend uploads directly to Cloudinary)
const submitCloudinaryMedia = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { mediaUrls } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
            throw new badRequest_1.default("No media URLs provided");
        }
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        if (!event.isActive) {
            throw new badRequest_1.default("Event is not active");
        }
        // Get user's existing uploads (excluding face enrollment images)
        const userUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                uploadedBy: userId,
                isActive: true,
                isFaceEnrollment: { [sequelize_1.Op.not]: true }, // Exclude face enrollment images
            },
        });
        const { maxUploads, isCreator, userType } = getUploadLimits(event, userId);
        // Check limits
        if (userUploads >= maxUploads) {
            throw new badRequest_1.default(`You have reached your upload limit of ${maxUploads} files for ${userType}s in this event`);
        }
        if (userUploads + mediaUrls.length > maxUploads) {
            throw new badRequest_1.default(`Submitting ${mediaUrls.length} files would exceed your limit of ${maxUploads} for ${userType}s. You have ${maxUploads - userUploads} uploads remaining.`);
        }
        // Validate Cloudinary URLs belong to your cloud (security check)
        const validCloudinaryDomain = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
        // Create database records
        const mediaRecords = [];
        for (const mediaData of mediaUrls) {
            // Security: Verify URL is from your Cloudinary account
            if (!mediaData.url.startsWith(validCloudinaryDomain)) {
                throw new badRequest_1.default(`Invalid media URL: ${mediaData.fileName}`);
            }
            const mediaType = mediaData.mimeType.startsWith("video/")
                ? eventMedia_1.MediaType.VIDEO
                : eventMedia_1.MediaType.IMAGE;
            const mediaRecord = await eventMedia_1.default.create({
                eventId,
                uploadedBy: userId,
                mediaType,
                mediaUrl: mediaData.url,
                fileName: mediaData.fileName,
                fileSize: mediaData.fileSize,
                mimeType: mediaData.mimeType,
                cloudinaryPublicId: mediaData.publicId,
            });
            mediaRecords.push(mediaRecord);
        }
        // Process faces in uploaded images (async, don't wait for completion)
        const imageMediaIds = mediaRecords
            .filter((media) => media.mediaType === eventMedia_1.MediaType.IMAGE)
            .map((media) => media.id);
        if (imageMediaIds.length > 0) {
            // Process faces asynchronously
            faceProcessingService_1.default.processMultipleMediaForFaces(imageMediaIds)
                .then((results) => {
                console.log(`Face processing completed for ${imageMediaIds.length} images:`, results);
            })
                .catch((error) => {
                console.error("Face processing failed:", error);
            });
        }
        // Get updated stats (excluding face enrollment images)
        const updatedUserUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                uploadedBy: userId,
                isActive: true,
                isFaceEnrollment: { [sequelize_1.Op.not]: true }, // Exclude face enrollment images
            },
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Media uploaded successfully",
            uploadedMedia: mediaRecords,
            uploadStats: {
                totalUploads: updatedUserUploads,
                remainingUploads: maxUploads - updatedUserUploads,
                maxUploads,
                userType,
                isCreator,
            },
            faceProcessing: {
                imagesProcessed: imageMediaIds.length,
                status: "processing",
            },
        });
    }
    catch (error) {
        console.error("Submit Cloudinary media error:", error);
        next(error);
    }
};
exports.submitCloudinaryMedia = submitCloudinaryMedia;
// Generate Cloudinary signature for secure frontend uploads
const getCloudinarySignature = async (req, res, next) => {
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
        if (!event.isActive) {
            throw new badRequest_1.default("Event is not active");
        }
        // Check user's current upload count (excluding face enrollment images)
        const userUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                uploadedBy: userId,
                isActive: true,
                isFaceEnrollment: { [sequelize_1.Op.not]: true }, // Exclude face enrollment images
            },
        });
        const { maxUploads, isCreator, userType } = getUploadLimits(event, userId);
        if (userUploads >= maxUploads) {
            throw new badRequest_1.default(`You have reached your upload limit of ${maxUploads} files for ${userType}s in this event`);
        }
        // Generate timestamp for signature
        const timestamp = Math.round(new Date().getTime() / 1000);
        // Parameters for Cloudinary upload - MUST match exactly what frontend sends
        const params = {
            folder: `events/${eventId}`,
            timestamp: timestamp,
        };
        // console.log("Params being signed:", params);
        // console.log(
        //   "String being signed:",
        //   `folder=${params.folder}&timestamp=${params.timestamp}`
        // );
        // Generate signature using only the parameters that will be sent
        const signature = cloudinary_1.v2.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
        // console.log("Generated signature:", signature);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder: `events/${eventId}`,
            uploadStats: {
                currentUploads: userUploads,
                maxUploads,
                remainingUploads: maxUploads - userUploads,
                userType,
                isCreator,
            },
        });
    }
    catch (error) {
        console.error("Get Cloudinary signature error:", error);
        next(error);
    }
};
exports.getCloudinarySignature = getCloudinarySignature;
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
            eventId: event.id,
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
        // Get upload statistics using new tiered limits
        const totalUploads = userUploads.length;
        const { maxUploads, isCreator, userType } = getUploadLimits(event, userId);
        const remainingUploads = maxUploads - totalUploads;
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
                maxUploads,
                userType,
                isCreator,
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
        // Get total uploads for the event (excluding face enrollment images)
        const totalUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                isActive: true,
                isFaceEnrollment: { [sequelize_1.Op.not]: true }, // Exclude face enrollment images
            },
        });
        // Get uploads by type (excluding face enrollment images)
        const uploadsByType = await eventMedia_1.default.findAll({
            where: {
                eventId,
                isActive: true,
                isFaceEnrollment: { [sequelize_1.Op.not]: true }, // Exclude face enrollment images
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
                    eventMedia_1.default.sequelize.fn("COUNT", eventMedia_1.default.sequelize.col("EventMedia.id")),
                    "uploadCount",
                ],
                [
                    eventMedia_1.default.sequelize.fn("SUM", eventMedia_1.default.sequelize.col("EventMedia.fileSize")),
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
                    eventMedia_1.default.sequelize.fn("COUNT", eventMedia_1.default.sequelize.col("EventMedia.id")),
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
// List all participants for an event with their uploads
const getEventParticipantsWithUploads = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        // Ensure event exists
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Find distinct uploaders for the event with counts
        const participants = await eventMedia_1.default.findAll({
            where: { eventId, isActive: true },
            attributes: [
                "uploadedBy",
                [
                    eventMedia_1.default.sequelize.fn("COUNT", eventMedia_1.default.sequelize.col("EventMedia.id")),
                    "uploadCount",
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
                    eventMedia_1.default.sequelize.fn("COUNT", eventMedia_1.default.sequelize.col("EventMedia.id")),
                    "DESC",
                ],
            ],
            offset,
            limit: limitNum,
            raw: true,
            nest: true,
        });
        // Total unique participants for pagination
        const totalParticipants = await eventMedia_1.default.count({
            where: { eventId, isActive: true },
            distinct: true,
            col: "uploadedBy",
        });
        // For each participant, fetch a few recent uploads (thumbnails)
        const participantIds = participants.map((p) => p.uploadedBy);
        const recentUploads = await eventMedia_1.default.findAll({
            where: {
                eventId,
                isActive: true,
                uploadedBy: participantIds.length ? participantIds : undefined,
            },
            include: [
                {
                    model: user_1.default,
                    as: "uploader",
                    attributes: ["id"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum * 3, // up to three per participant on average
        });
        const uploadsByUser = {};
        for (const media of recentUploads) {
            const key = media.uploadedBy;
            if (!uploadsByUser[key])
                uploadsByUser[key] = [];
            if (uploadsByUser[key].length < 3) {
                uploadsByUser[key].push({
                    id: media.id,
                    mediaType: media.mediaType,
                    mediaUrl: media.mediaUrl,
                    createdAt: media.createdAt,
                });
            }
        }
        const data = participants.map((p) => ({
            user: p.uploader,
            uploadedBy: p.uploadedBy,
            uploadCount: Number(p.uploadCount || 0),
            recentUploads: uploadsByUser[p.uploadedBy] || [],
        }));
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Participants with uploads retrieved successfully",
            participants: data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalParticipants,
                totalPages: Math.ceil(totalParticipants / limitNum),
            },
            eventInfo: { id: event.id, title: event.title },
        });
    }
    catch (error) {
        console.error("Get event participants error:", error);
        next(error);
    }
};
exports.getEventParticipantsWithUploads = getEventParticipantsWithUploads;
// Get all uploads for a specific user in an event
const getEventUserUploads = async (req, res, next) => {
    try {
        const { eventId, userId } = req.params;
        const { page = 1, limit = 20, mediaType } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        // Ensure event exists
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Ensure user exists
        const uploader = await user_1.default.findByPk(userId);
        if (!uploader) {
            throw new notFound_1.default("User not found");
        }
        const whereClause = { eventId, uploadedBy: userId, isActive: true };
        if (mediaType &&
            Object.values(eventMedia_1.MediaType).includes(mediaType)) {
            whereClause.mediaType = mediaType;
        }
        const { count, rows } = await eventMedia_1.default.findAndCountAll({
            where: whereClause,
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "User uploads retrieved successfully",
            uploads: rows,
            user: {
                id: uploader.id,
                fullname: uploader.fullname,
                email: uploader.email,
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
            },
            eventInfo: { id: event.id, title: event.title },
        });
    }
    catch (error) {
        console.error("Get event user uploads error:", error);
        next(error);
    }
};
exports.getEventUserUploads = getEventUserUploads;
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
        // Get paginated media with uploader info
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
        // Get total unique participants count
        const uniqueParticipants = await eventMedia_1.default.count({
            where: {
                eventId: event.id,
                isActive: true,
            },
            distinct: true,
            col: "uploadedBy",
        });
        // Get media type breakdown
        const mediaTypeBreakdown = await eventMedia_1.default.findAll({
            where: {
                eventId: event.id,
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
        // Process statistics
        const totalParticipants = uniqueParticipants || 0;
        const mediaStats = mediaTypeBreakdown.reduce((acc, item) => {
            acc[item.mediaType] = parseInt(item.count);
            return acc;
        }, {});
        const totalPhotos = mediaStats[eventMedia_1.MediaType.IMAGE] || 0;
        const totalVideos = mediaStats[eventMedia_1.MediaType.VIDEO] || 0;
        const totalMedia = totalPhotos + totalVideos;
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
            participantStats: {
                totalParticipants: totalParticipants,
                totalMedia: totalMedia,
                totalPhotos: totalPhotos,
                totalVideos: totalVideos,
                mediaBreakdown: mediaStats,
            },
        });
    }
    catch (error) {
        console.error("Get event media by slug error:", error);
        next(error);
    }
};
exports.getEventMediaBySlug = getEventMediaBySlug;
// Get media filtered by user's face detection
const getMediaWithUserFaces = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20, similarityThreshold = 0.8 } = req.query;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const threshold = parseFloat(similarityThreshold);
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Get media with user's faces using the specified threshold
        const mediaWithFaces = await faceProcessingService_1.default.getMediaWithUserFaces(eventId, userId, threshold);
        // Apply pagination
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedMedia = mediaWithFaces.slice(startIndex, endIndex);
        // Calculate summary statistics
        const summary = {
            totalMatches: mediaWithFaces.length,
            highConfidenceMatches: mediaWithFaces.filter((m) => m.overallConfidence > 0.7).length,
            mediumConfidenceMatches: mediaWithFaces.filter((m) => m.overallConfidence > 0.5 && m.overallConfidence <= 0.7).length,
            lowConfidenceMatches: mediaWithFaces.filter((m) => m.overallConfidence <= 0.5).length,
        };
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: `Found ${mediaWithFaces.length} media items containing your face`,
            data: {
                userId,
                matches: paginatedMedia,
                summary,
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: mediaWithFaces.length,
                totalPages: Math.ceil(mediaWithFaces.length / limitNum),
            },
            eventInfo: {
                id: event.id,
                title: event.title,
            },
        });
    }
    catch (error) {
        console.error("Get media with user faces error:", error);
        next(error);
    }
};
exports.getMediaWithUserFaces = getMediaWithUserFaces;
// Get all face detections for an event (admin/event creator only)
const getEventFaceDetections = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Check permissions
        const user = await user_1.default.findByPk(userId);
        if (!user) {
            throw new notFound_1.default("User not found");
        }
        const isEventCreator = event.createdBy === userId;
        const isAdmin = user.role === "admin" || user.role === "superadmin";
        if (!isEventCreator && !isAdmin) {
            throw new unauthorized_1.default("You don't have permission to view face detections");
        }
        // Get face detections
        const result = await faceProcessingService_1.default.getEventFaceDetections(eventId, pageNum, limitNum);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face detections retrieved successfully",
            ...result,
            eventInfo: {
                id: event.id,
                title: event.title,
            },
        });
    }
    catch (error) {
        console.error("Get event face detections error:", error);
        next(error);
    }
};
exports.getEventFaceDetections = getEventFaceDetections;
// Get face detection statistics for an event (admin/event creator only)
const getEventFaceStats = async (req, res, next) => {
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
        // Check permissions
        const user = await user_1.default.findByPk(userId);
        if (!user) {
            throw new notFound_1.default("User not found");
        }
        const isEventCreator = event.createdBy === userId;
        const isAdmin = user.role === "admin" || user.role === "superadmin";
        if (!isEventCreator && !isAdmin) {
            throw new unauthorized_1.default("You don't have permission to view face statistics");
        }
        // Get face statistics
        const stats = await faceProcessingService_1.default.getEventFaceStats(eventId);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face detection statistics retrieved successfully",
            stats,
            eventInfo: {
                id: event.id,
                title: event.title,
            },
        });
    }
    catch (error) {
        console.error("Get event face stats error:", error);
        next(error);
    }
};
exports.getEventFaceStats = getEventFaceStats;
// Retrain face identification for an event (admin/event creator only)
const retrainFaceIdentification = async (req, res, next) => {
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
        // Check permissions
        const user = await user_1.default.findByPk(userId);
        if (!user) {
            throw new notFound_1.default("User not found");
        }
        const isEventCreator = event.createdBy === userId;
        const isAdmin = user.role === "admin" || user.role === "superadmin";
        if (!isEventCreator && !isAdmin) {
            throw new unauthorized_1.default("You don't have permission to retrain face identification");
        }
        // Retrain face identification
        const success = await faceProcessingService_1.default.retrainEventFaceIdentification(eventId);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success,
            message: success
                ? "Face identification retraining started successfully"
                : "Failed to start face identification retraining",
            eventInfo: {
                id: event.id,
                title: event.title,
            },
        });
    }
    catch (error) {
        console.error("Retrain face identification error:", error);
        next(error);
    }
};
exports.retrainFaceIdentification = retrainFaceIdentification;
// Middleware to handle file upload
exports.uploadMiddleware = fileUpload_1.default.array("media", 10);
// Submit S3 media URLs (Frontend uploads directly to S3)
const submitS3Media = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { mediaUrls } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
            throw new badRequest_1.default("No media URLs provided");
        }
        // Verify event exists and user has access
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Allow any authenticated user to upload to events
        // Event creators and users accessing via slug/QR code can both upload
        // No additional access restrictions needed since user is already authenticated
        // Check photo upload limits based on user role
        const currentUploads = await eventMedia_1.default.count({
            where: { eventId, uploadedBy: userId },
        });
        const { maxUploads, isCreator, userType } = getUploadLimits(event, userId);
        if (currentUploads + mediaUrls.length > maxUploads) {
            throw new badRequest_1.default(`Upload limit exceeded. Maximum ${maxUploads} photos allowed for ${userType}s in this event.`);
        }
        const uploadedMedia = [];
        for (const mediaData of mediaUrls) {
            // Validate S3 URLs belong to your bucket (security check)
            const validS3Domain = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/`;
            if (!mediaData.url.startsWith(validS3Domain)) {
                throw new badRequest_1.default("Invalid media URL - must be from your S3 bucket");
            }
            // Verify file exists in S3
            const fileExists = await s3Service_1.default.fileExists(mediaData.s3Key);
            if (!fileExists) {
                throw new badRequest_1.default(`File not found in S3: ${mediaData.s3Key}`);
            }
            // Create media record
            const mediaRecord = await eventMedia_1.default.create({
                eventId,
                uploadedBy: userId,
                mediaUrl: mediaData.url,
                mediaType: (0, fileUpload_1.getMediaTypeFromMimeType)(mediaData.mimeType),
                fileName: mediaData.fileName,
                fileSize: mediaData.fileSize,
                mimeType: mediaData.mimeType,
                s3Key: mediaData.s3Key, // Store S3 key instead of Cloudinary public ID
                isFaceEnrollment: false,
            });
            uploadedMedia.push(mediaRecord);
            // Process face detection for images
            if ((0, fileUpload_1.getMediaTypeFromMimeType)(mediaData.mimeType) === eventMedia_1.MediaType.IMAGE) {
                try {
                    await faceProcessingService_1.default.processMediaForFaces(mediaRecord.id);
                }
                catch (faceError) {
                    console.error("Face processing error:", faceError);
                    // Don't fail the upload if face processing fails
                }
            }
        }
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: `Successfully uploaded ${uploadedMedia.length} media files`,
            data: {
                media: uploadedMedia,
                uploadStats: {
                    totalUploads: currentUploads + uploadedMedia.length,
                    maxUploads,
                    remainingUploads: maxUploads - (currentUploads + uploadedMedia.length),
                    userType,
                    isCreator,
                },
            },
        });
    }
    catch (error) {
        console.error("Submit S3 media error:", error);
        next(error);
    }
};
exports.submitS3Media = submitS3Media;
// Generate S3 presigned URL for event flyer upload
const getEventFlyerS3PresignedUrl = async (req, res, next) => {
    try {
        const { fileName, mimeType, eventId } = req.body;
        const userId = req.user?.id; // Optional - can be undefined for public access
        if (!fileName || !mimeType) {
            throw new badRequest_1.default("File name and MIME type are required");
        }
        // Validate file type for event flyers (images only)
        if (!mimeType.startsWith("image/")) {
            throw new badRequest_1.default("Event flyer must be an image file");
        }
        // Generate unique key for the event flyer
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
        // Create a unique key for event flyers
        // Use 'public' folder if no user ID (for event creation flow)
        const userFolder = userId || "public";
        const key = `event-flyers/${userFolder}/${timestamp}-${randomId}.${extension}`;
        // Generate presigned URL
        const presignedData = await s3Service_1.default.getPresignedUploadUrl(key, mimeType);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Event flyer presigned URL generated successfully",
            data: {
                uploadUrl: presignedData.uploadUrl,
                key: presignedData.key,
                url: presignedData.url,
                expiresIn: 3600, // 1 hour
                fileType: "event-flyer",
            },
        });
    }
    catch (error) {
        console.error("Get event flyer S3 presigned URL error:", error);
        next(error);
    }
};
exports.getEventFlyerS3PresignedUrl = getEventFlyerS3PresignedUrl;
// Generate S3 presigned URL for direct upload from frontend
const getS3PresignedUrl = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { fileName, mimeType } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        if (!fileName || !mimeType) {
            throw new badRequest_1.default("File name and MIME type are required");
        }
        // Verify event exists and user has access
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Check upload limits based on user role
        const currentUploads = await eventMedia_1.default.count({
            where: { eventId, uploadedBy: userId },
        });
        const { maxUploads, isCreator, userType } = getUploadLimits(event, userId);
        if (currentUploads >= maxUploads) {
            throw new badRequest_1.default(`Upload limit reached. Maximum ${maxUploads} photos allowed for ${userType}s in this event.`);
        }
        // Generate unique key for the file
        const key = s3Service_1.default.generateKey(eventId, userId, fileName, (0, fileUpload_1.getMediaTypeFromMimeType)(mimeType));
        // Generate presigned URL
        const presignedData = await s3Service_1.default.getPresignedUploadUrl(key, mimeType);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Presigned URL generated successfully",
            data: {
                uploadUrl: presignedData.uploadUrl,
                key: presignedData.key,
                url: presignedData.url,
                expiresIn: 3600, // 1 hour
                uploadStats: {
                    currentUploads,
                    maxUploads,
                    remainingUploads: maxUploads - currentUploads,
                    userType,
                    isCreator,
                },
            },
        });
    }
    catch (error) {
        console.error("Get S3 presigned URL error:", error);
        next(error);
    }
};
exports.getS3PresignedUrl = getS3PresignedUrl;
