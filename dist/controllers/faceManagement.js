"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMediaFaceDetections = exports.getEventFaceProfiles = exports.getFaceDetectionStats = exports.deleteUserFaceProfile = exports.getUserFaceProfile = exports.enrollUserFace = void 0;
const http_status_codes_1 = require("http-status-codes");
const event_1 = __importDefault(require("../models/event"));
const eventMedia_1 = __importDefault(require("../models/eventMedia"));
const user_1 = __importDefault(require("../models/user"));
const faceDetection_1 = __importDefault(require("../models/faceDetection"));
const userFaceProfile_1 = __importDefault(require("../models/userFaceProfile"));
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const notFound_1 = __importDefault(require("../errors/notFound"));
const unauthorized_1 = __importDefault(require("../errors/unauthorized"));
const azureFaceService_1 = __importDefault(require("../utils/azureFaceService"));
// Enroll user's face for an event
const enrollUserFace = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { mediaId } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        if (!mediaId) {
            throw new badRequest_1.default("Media ID is required for face enrollment");
        }
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        if (!event.isActive) {
            throw new badRequest_1.default("Event is not active");
        }
        // Find the media
        const media = await eventMedia_1.default.findOne({
            where: {
                id: mediaId,
                eventId,
                uploadedBy: userId,
                isActive: true,
            },
        });
        if (!media) {
            throw new notFound_1.default("Media not found or you don't have permission to use it");
        }
        // Check if user already has a face profile for this event
        const existingProfile = await userFaceProfile_1.default.findOne({
            where: {
                userId,
                eventId,
                isActive: true,
            },
        });
        if (existingProfile) {
            throw new badRequest_1.default("You already have a face profile for this event");
        }
        // Validate image URL
        const isValidUrl = await azureFaceService_1.default.validateImageUrl(media.mediaUrl);
        if (!isValidUrl) {
            throw new badRequest_1.default("Invalid or inaccessible media URL");
        }
        // Detect faces in the image
        const faceDetections = await azureFaceService_1.default.detectFacesFromUrl(media.mediaUrl);
        if (faceDetections.length === 0) {
            throw new badRequest_1.default("No faces detected in the selected image");
        }
        if (faceDetections.length > 1) {
            throw new badRequest_1.default("Multiple faces detected. Please select an image with only your face");
        }
        const faceDetection = faceDetections[0];
        // Create person group for event if it doesn't exist
        try {
            await azureFaceService_1.default.createPersonGroup(eventId, event.title);
        }
        catch (error) {
            // Person group might already exist, continue
            console.log("Person group might already exist:", error);
        }
        // Create person in the person group
        const user = await user_1.default.findByPk(userId);
        if (!user) {
            throw new notFound_1.default("User not found");
        }
        const personId = await azureFaceService_1.default.createPerson(eventId, userId, user.fullname);
        // Add face to person
        const persistedFaceId = await azureFaceService_1.default.addFaceToPerson(eventId, personId, media.mediaUrl);
        // Train the person group
        await azureFaceService_1.default.trainPersonGroup(eventId);
        // Create user face profile record
        const faceProfile = await userFaceProfile_1.default.create({
            userId,
            eventId,
            persistedFaceId,
            faceId: faceDetection.faceId,
            enrollmentMediaId: mediaId,
            faceRectangle: faceDetection.faceRectangle,
            faceAttributes: faceDetection.faceAttributes,
            enrollmentConfidence: faceDetection.confidence || 1.0,
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Face enrolled successfully",
            faceProfile: {
                id: faceProfile.id,
                userId: faceProfile.userId,
                eventId: faceProfile.eventId,
                enrollmentConfidence: faceProfile.enrollmentConfidence,
                faceAttributes: faceProfile.faceAttributes,
                createdAt: faceProfile.createdAt,
            },
            trainingStatus: "Training started. Face identification will be available shortly.",
        });
    }
    catch (error) {
        console.error("Face enrollment error:", error);
        next(error);
    }
};
exports.enrollUserFace = enrollUserFace;
// Get user's face profile for an event
const getUserFaceProfile = async (req, res, next) => {
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
        // Find user's face profile
        const faceProfile = await userFaceProfile_1.default.findOne({
            where: {
                userId,
                eventId,
                isActive: true,
            },
            include: [
                {
                    model: eventMedia_1.default,
                    as: "enrollmentMedia",
                    attributes: ["id", "mediaUrl", "fileName", "createdAt"],
                },
            ],
        });
        if (!faceProfile) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: "No face profile found for this event",
                faceProfile: null,
            });
        }
        // Get training status
        let trainingStatus = "unknown";
        try {
            trainingStatus = await azureFaceService_1.default.getPersonGroupTrainingStatus(eventId);
        }
        catch (error) {
            console.error("Error getting training status:", error);
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face profile retrieved successfully",
            faceProfile: {
                id: faceProfile.id,
                userId: faceProfile.userId,
                eventId: faceProfile.eventId,
                enrollmentConfidence: faceProfile.enrollmentConfidence,
                faceAttributes: faceProfile.faceAttributes,
                enrollmentMedia: faceProfile.enrollmentMedia,
                createdAt: faceProfile.createdAt,
                updatedAt: faceProfile.updatedAt,
            },
            trainingStatus,
        });
    }
    catch (error) {
        console.error("Get face profile error:", error);
        next(error);
    }
};
exports.getUserFaceProfile = getUserFaceProfile;
// Delete user's face profile
const deleteUserFaceProfile = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        // Find user's face profile
        const faceProfile = await userFaceProfile_1.default.findOne({
            where: {
                userId,
                eventId,
                isActive: true,
            },
        });
        if (!faceProfile) {
            throw new notFound_1.default("Face profile not found");
        }
        // Get person information to delete from Azure
        try {
            const persons = await azureFaceService_1.default.listPersons(eventId);
            const person = persons.find((p) => p.userData === `User: ${userId}`);
            if (person) {
                await azureFaceService_1.default.deletePerson(eventId, person.personId);
            }
        }
        catch (error) {
            console.error("Error deleting person from Azure:", error);
            // Continue with database deletion even if Azure deletion fails
        }
        // Soft delete the face profile
        await faceProfile.update({ isActive: false });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face profile deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete face profile error:", error);
        next(error);
    }
};
exports.deleteUserFaceProfile = deleteUserFaceProfile;
// Get face detection statistics for an event
const getFaceDetectionStats = async (req, res, next) => {
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
        // Check if user is event creator or admin
        const user = await user_1.default.findByPk(userId);
        if (!user) {
            throw new notFound_1.default("User not found");
        }
        const isEventCreator = event.createdBy === userId;
        const isAdmin = user.role === "admin" || user.role === "superadmin";
        if (!isEventCreator && !isAdmin) {
            throw new unauthorized_1.default("You don't have permission to view face detection statistics");
        }
        // Get face detection statistics
        const totalFaceDetections = await faceDetection_1.default.count({
            where: {
                eventId,
                isActive: true,
            },
        });
        const identifiedFaces = await faceDetection_1.default.count({
            where: {
                eventId,
                isActive: true,
                isIdentified: true,
            },
        });
        const unidentifiedFaces = totalFaceDetections - identifiedFaces;
        const totalFaceProfiles = await userFaceProfile_1.default.count({
            where: {
                eventId,
                isActive: true,
            },
        });
        const mediaWithFaces = await faceDetection_1.default.count({
            where: {
                eventId,
                isActive: true,
            },
            distinct: true,
            col: "mediaId",
        });
        // Get training status
        let trainingStatus = "unknown";
        try {
            trainingStatus = await azureFaceService_1.default.getPersonGroupTrainingStatus(eventId);
        }
        catch (error) {
            console.error("Error getting training status:", error);
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face detection statistics retrieved successfully",
            stats: {
                totalFaceDetections,
                identifiedFaces,
                unidentifiedFaces,
                totalFaceProfiles,
                mediaWithFaces,
                trainingStatus,
                eventInfo: {
                    id: event.id,
                    title: event.title,
                },
            },
        });
    }
    catch (error) {
        console.error("Get face detection stats error:", error);
        next(error);
    }
};
exports.getFaceDetectionStats = getFaceDetectionStats;
// Get all face profiles for an event (admin only)
const getEventFaceProfiles = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        // Check if user is event creator or admin
        const user = await user_1.default.findByPk(userId);
        if (!user) {
            throw new notFound_1.default("User not found");
        }
        const isEventCreator = event.createdBy === userId;
        const isAdmin = user.role === "admin" || user.role === "superadmin";
        if (!isEventCreator && !isAdmin) {
            throw new unauthorized_1.default("You don't have permission to view face profiles");
        }
        // Get face profiles with pagination
        const { count, rows: faceProfiles } = await userFaceProfile_1.default.findAndCountAll({
            where: {
                eventId,
                isActive: true,
            },
            include: [
                {
                    model: user_1.default,
                    as: "user",
                    attributes: ["id", "fullname", "email"],
                },
                {
                    model: eventMedia_1.default,
                    as: "enrollmentMedia",
                    attributes: ["id", "mediaUrl", "fileName", "createdAt"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset: offset,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face profiles retrieved successfully",
            faceProfiles,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
            },
            eventInfo: {
                id: event.id,
                title: event.title,
            },
        });
    }
    catch (error) {
        console.error("Get event face profiles error:", error);
        next(error);
    }
};
exports.getEventFaceProfiles = getEventFaceProfiles;
// Get face detections for a specific media
const getMediaFaceDetections = async (req, res, next) => {
    try {
        const { mediaId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        // Find the media
        const media = await eventMedia_1.default.findByPk(mediaId, {
            include: [
                {
                    model: event_1.default,
                    as: "event",
                    attributes: ["id", "title", "createdBy"],
                },
            ],
        });
        if (!media) {
            throw new notFound_1.default("Media not found");
        }
        // Check permissions
        const user = await user_1.default.findByPk(userId);
        if (!user) {
            throw new notFound_1.default("User not found");
        }
        const isMediaUploader = media.uploadedBy === userId;
        const isEventCreator = media.event.createdBy === userId;
        const isAdmin = user.role === "admin" || user.role === "superadmin";
        if (!isMediaUploader && !isEventCreator && !isAdmin) {
            throw new unauthorized_1.default("You don't have permission to view face detections for this media");
        }
        // Get face detections for this media
        const faceDetections = await faceDetection_1.default.findAll({
            where: {
                mediaId,
                isActive: true,
            },
            include: [
                {
                    model: user_1.default,
                    as: "identifiedUser",
                    attributes: ["id", "fullname", "email"],
                },
            ],
            order: [["createdAt", "ASC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face detections retrieved successfully",
            faceDetections,
            mediaInfo: {
                id: media.id,
                mediaUrl: media.mediaUrl,
                fileName: media.fileName,
                mediaType: media.mediaType,
                uploadedBy: media.uploadedBy,
            },
        });
    }
    catch (error) {
        console.error("Get media face detections error:", error);
        next(error);
    }
};
exports.getMediaFaceDetections = getMediaFaceDetections;
