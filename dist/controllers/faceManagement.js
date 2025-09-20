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
exports.submitFaceEnrollmentFromS3 = exports.getFaceEnrollmentS3PresignedUrl = exports.getMediaFaceDetections = exports.getEventFaceProfiles = exports.getFaceDetectionStats = exports.deleteUserFaceProfile = exports.getUserFaceProfile = exports.enrollUserFace = exports.debugFaceDetections = exports.testFaceDetection = exports.testGoogleVisionAPI = void 0;
const http_status_codes_1 = require("http-status-codes");
const event_1 = __importDefault(require("../models/event"));
const eventMedia_1 = __importStar(require("../models/eventMedia"));
const user_1 = __importDefault(require("../models/user"));
const faceDetection_1 = __importDefault(require("../models/faceDetection"));
const userFaceProfile_1 = __importDefault(require("../models/userFaceProfile"));
const badRequest_1 = __importDefault(require("../errors/badRequest"));
const notFound_1 = __importDefault(require("../errors/notFound"));
const unauthorized_1 = __importDefault(require("../errors/unauthorized"));
const googleVisionService_1 = __importDefault(require("../utils/googleVisionService"));
const s3Service_1 = __importDefault(require("../utils/s3Service"));
// Test Google Vision API connection
const testGoogleVisionAPI = async (req, res, next) => {
    try {
        console.log("Testing Google Vision API connection...");
        const isConnected = await googleVisionService_1.default.testConnection();
        if (isConnected) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: "Google Vision API connection successful",
                connected: true,
            });
        }
        else {
            return res.status(http_status_codes_1.StatusCodes.SERVICE_UNAVAILABLE).json({
                success: false,
                message: "Google Vision API connection failed",
                connected: false,
            });
        }
    }
    catch (error) {
        console.error("Google Vision API test error:", error);
        next(error);
    }
};
exports.testGoogleVisionAPI = testGoogleVisionAPI;
// Test face detection with a specific image URL
const testFaceDetection = async (req, res, next) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            throw new badRequest_1.default("Image URL is required");
        }
        console.log("Testing face detection with URL:", imageUrl);
        // Test URL accessibility
        const isValidUrl = await googleVisionService_1.default.validateImageUrl(imageUrl);
        console.log("URL validation result:", isValidUrl);
        if (!isValidUrl) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Image URL is not accessible",
                url: imageUrl,
                isValid: false,
            });
        }
        // Test face detection
        const faceDetections = await googleVisionService_1.default.detectFacesFromUrl(imageUrl);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face detection test completed",
            url: imageUrl,
            isValid: true,
            facesDetected: faceDetections.length,
            faces: faceDetections.map((f) => ({
                faceId: f.faceId,
                confidence: f.confidence,
                rectangle: f.faceRectangle,
                attributes: f.faceAttributes,
            })),
        });
    }
    catch (error) {
        console.error("Face detection test error:", error);
        next(error);
    }
};
exports.testFaceDetection = testFaceDetection;
// Debug face detections for an event
const debugFaceDetections = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        // Get all face detections for this event
        const faceDetections = await faceDetection_1.default.findAll({
            where: {
                eventId,
                isActive: true,
            },
            include: [
                {
                    model: eventMedia_1.default,
                    as: "media",
                    attributes: ["id", "mediaUrl", "fileName", "mediaType"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        // Get user's face profile
        const userFaceProfile = await userFaceProfile_1.default.findOne({
            where: {
                eventId,
                userId,
                isActive: true,
            },
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face detection debug info",
            debug: {
                totalFaceDetections: faceDetections.length,
                userFaceProfile: userFaceProfile
                    ? {
                        id: userFaceProfile.id,
                        faceRectangle: userFaceProfile.faceRectangle,
                        enrollmentConfidence: userFaceProfile.enrollmentConfidence,
                    }
                    : null,
                faceDetections: faceDetections.map((detection) => ({
                    id: detection.id,
                    faceId: detection.faceId,
                    faceRectangle: detection.faceRectangle,
                    confidence: detection.confidence,
                    mediaId: detection.mediaId,
                    mediaUrl: detection.media?.mediaUrl,
                    fileName: detection.media?.fileName,
                    createdAt: detection.createdAt,
                })),
            },
        });
    }
    catch (error) {
        console.error("Debug face detections error:", error);
        next(error);
    }
};
exports.debugFaceDetections = debugFaceDetections;
// Enroll user's face for an event
const enrollUserFace = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        // Check if this is a file upload or mediaId request
        const faceImage = req.file;
        const { mediaId } = req.body;
        if (!faceImage && !mediaId) {
            throw new badRequest_1.default("Either a face image file or media ID is required for face enrollment");
        }
        // Find the event
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        if (!event.isActive) {
            throw new badRequest_1.default("Event is not active");
        }
        let imageUrl;
        let mediaRecord = null;
        if (faceImage) {
            // Handle file upload - upload to S3 to avoid Cloudinary 10MB limit
            const S3Service = require("../utils/s3Service").default;
            // Generate unique key for face enrollment image
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 15);
            const extension = faceImage.originalname?.split(".").pop()?.toLowerCase() || "jpg";
            const key = `face-enrollment/${userId}/${eventId}/${timestamp}-${randomId}.${extension}`;
            // Upload to S3
            const uploadResult = await S3Service.uploadFile(faceImage.buffer, key, faceImage.mimetype || "image/jpeg");
            imageUrl = uploadResult.url;
            // Create a media record for the uploaded face image
            mediaRecord = await eventMedia_1.default.create({
                eventId,
                uploadedBy: userId,
                mediaType: eventMedia_1.MediaType.IMAGE,
                mediaUrl: imageUrl,
                fileName: faceImage.originalname || "face-enrollment.jpg",
                fileSize: faceImage.size || 0,
                mimeType: faceImage.mimetype || "image/jpeg",
                s3Key: key, // Store S3 key instead of Cloudinary public ID
                isFaceEnrollment: true, // Mark as face enrollment to exclude from upload limits
            });
        }
        else {
            // Handle mediaId - find existing media
            mediaRecord = await eventMedia_1.default.findOne({
                where: {
                    id: mediaId,
                    eventId,
                    uploadedBy: userId,
                    isActive: true,
                },
            });
            if (!mediaRecord) {
                throw new notFound_1.default("Media not found or you don't have permission to use it");
            }
            imageUrl = mediaRecord.mediaUrl;
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
        const isValidUrl = await googleVisionService_1.default.validateImageUrl(imageUrl);
        if (!isValidUrl) {
            throw new badRequest_1.default("Invalid or inaccessible image URL");
        }
        // Detect faces in the image using Google Vision
        const faceDetections = await googleVisionService_1.default.detectFacesFromUrl(imageUrl);
        if (faceDetections.length === 0) {
            throw new badRequest_1.default("No faces detected in the selected image");
        }
        if (faceDetections.length > 1) {
            throw new badRequest_1.default("Multiple faces detected. Please select an image with only your face");
        }
        const faceDetection = faceDetections[0];
        // Create user face profile record (detection only - no Azure identification)
        const faceProfile = await userFaceProfile_1.default.create({
            userId,
            eventId,
            persistedFaceId: `detection_only_${userId}_${eventId}_${Date.now()}`, // Generate a local ID
            faceId: faceDetection.faceId,
            enrollmentMediaId: mediaRecord.id, // Now we always have a media record
            faceRectangle: faceDetection.faceRectangle,
            faceAttributes: faceDetection.faceAttributes,
            enrollmentConfidence: faceDetection.confidence || 1.0,
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Face enrolled successfully using Google Vision API",
            faceProfile: {
                id: faceProfile.id,
                userId: faceProfile.userId,
                eventId: faceProfile.eventId,
                enrollmentConfidence: faceProfile.enrollmentConfidence,
                faceAttributes: faceProfile.faceAttributes,
                enrollmentMediaId: faceProfile.enrollmentMediaId,
                createdAt: faceProfile.createdAt,
            },
            mediaInfo: {
                id: mediaRecord.id,
                mediaUrl: mediaRecord.mediaUrl,
                fileName: mediaRecord.fileName,
                mediaType: mediaRecord.mediaType,
            },
            trainingStatus: "Face detection enabled using Google Vision API. Face matching uses custom algorithm.",
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
            trainingStatus = "ready"; // Google Vision is always ready
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
        // Google Vision doesn't require person group management
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
            trainingStatus = "ready"; // Google Vision is always ready
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
// Get S3 presigned URL for face enrollment upload
const getFaceEnrollmentS3PresignedUrl = async (req, res, next) => {
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
        // Validate file type for face enrollment (images only)
        if (!mimeType.startsWith("image/")) {
            throw new badRequest_1.default("Face enrollment must be an image file");
        }
        // Check if event exists and is active
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        if (!event.isActive) {
            throw new badRequest_1.default("Event is not active");
        }
        // Check user's current face enrollment count (separate from regular media)
        const existingFaceUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                uploadedBy: userId,
                isFaceEnrollment: true, // Only count face enrollment uploads
            },
        });
        // Face enrollment quota: 5 photos per user
        const MAX_FACE_PHOTOS = 5;
        if (existingFaceUploads >= MAX_FACE_PHOTOS) {
            throw new badRequest_1.default(`Maximum face enrollment photos reached (${MAX_FACE_PHOTOS}). Please delete existing face photos before uploading new ones.`);
        }
        // Generate unique key for face enrollment
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
        // Create S3 path: faces/{eventId}/{userId}/timestamp-randomId.extension
        const key = `faces/${eventId}/${userId}/${timestamp}-${randomId}.${extension}`;
        // Generate presigned URL
        const presignedData = await s3Service_1.default.getPresignedUploadUrl(key, mimeType);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Face enrollment presigned URL generated successfully",
            data: {
                uploadUrl: presignedData.uploadUrl,
                key: presignedData.key,
                url: presignedData.url,
                expiresIn: 3600, // 1 hour
                fileType: "face-enrollment",
                quota: {
                    used: existingFaceUploads,
                    max: MAX_FACE_PHOTOS,
                    remaining: MAX_FACE_PHOTOS - existingFaceUploads,
                },
            },
        });
    }
    catch (error) {
        console.error("Get face enrollment S3 presigned URL error:", error);
        next(error);
    }
};
exports.getFaceEnrollmentS3PresignedUrl = getFaceEnrollmentS3PresignedUrl;
// Submit face enrollment from S3 presigned URL
const submitFaceEnrollmentFromS3 = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { s3Key, fileName, fileSize, mimeType } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new badRequest_1.default("User authentication required");
        }
        if (!s3Key || !fileName || !mimeType) {
            throw new badRequest_1.default("S3 key, file name, and MIME type are required");
        }
        // Check if event exists and is active
        const event = await event_1.default.findByPk(eventId);
        if (!event) {
            throw new notFound_1.default("Event not found");
        }
        if (!event.isActive) {
            throw new badRequest_1.default("Event is not active");
        }
        // Check user's current face enrollment count
        const existingFaceUploads = await eventMedia_1.default.count({
            where: {
                eventId,
                uploadedBy: userId,
                isFaceEnrollment: true,
            },
        });
        const MAX_FACE_PHOTOS = 5;
        if (existingFaceUploads >= MAX_FACE_PHOTOS) {
            throw new badRequest_1.default(`Maximum face enrollment photos reached (${MAX_FACE_PHOTOS}). Please delete existing face photos before uploading new ones.`);
        }
        // Construct the S3 URL from the key
        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Key}`;
        console.log("Face enrollment S3 URL:", s3Url);
        console.log("File details:", { fileName, fileSize, mimeType, s3Key });
        // Create media record for face enrollment (marked with isFaceEnrollment: true)
        const mediaRecord = await eventMedia_1.default.create({
            eventId,
            uploadedBy: userId,
            mediaType: eventMedia_1.MediaType.IMAGE,
            mediaUrl: s3Url,
            fileName: fileName,
            fileSize: fileSize || 0,
            mimeType: mimeType,
            s3Key: s3Key,
            isFaceEnrollment: true, // Mark as face enrollment to exclude from regular media
        });
        // Validate image URL accessibility first
        console.log("Validating image URL accessibility...");
        const isValidUrl = await googleVisionService_1.default.validateImageUrl(s3Url);
        console.log("Image URL validation result:", isValidUrl);
        if (!isValidUrl) {
            await mediaRecord.destroy();
            throw new badRequest_1.default("Image URL is not accessible. Please check if the file was uploaded correctly.");
        }
        // Now perform face enrollment using the S3 URL
        console.log("Starting face detection with Google Vision API...");
        const faceDetectionResult = await googleVisionService_1.default.detectFacesFromUrl(s3Url);
        console.log("Face detection result:", {
            facesDetected: faceDetectionResult.length,
            detections: faceDetectionResult.map((f) => ({
                faceId: f.faceId,
                confidence: f.confidence,
                rectangle: f.faceRectangle,
            })),
        });
        if (faceDetectionResult.length === 0) {
            // No face detected, delete the media record
            await mediaRecord.destroy();
            throw new badRequest_1.default("No face detected in the uploaded image. Please ensure the image contains a clear, well-lit face and try again.");
        }
        // Use the first detected face
        const detectedFace = faceDetectionResult[0];
        // Check if user already has a face profile for this event
        const existingProfile = await userFaceProfile_1.default.findOne({
            where: {
                eventId,
                userId,
            },
        });
        if (existingProfile) {
            // Update existing profile
            await existingProfile.update({
                enrollmentMediaId: mediaRecord.id, // Reference to the media record
                faceId: detectedFace.faceId,
                faceRectangle: detectedFace.faceRectangle,
                faceAttributes: detectedFace.faceAttributes,
                enrollmentConfidence: detectedFace.confidence || 0.8,
                isActive: true,
            });
            res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: "Face profile updated successfully",
                data: {
                    profile: existingProfile,
                    faceDetection: detectedFace,
                    mediaRecord,
                    quota: {
                        used: existingFaceUploads + 1,
                        max: MAX_FACE_PHOTOS,
                        remaining: MAX_FACE_PHOTOS - (existingFaceUploads + 1),
                    },
                },
            });
        }
        else {
            // Create new face profile
            const faceProfile = await userFaceProfile_1.default.create({
                eventId,
                userId,
                persistedFaceId: `face_${userId}_${eventId}_${Date.now()}`, // Generate unique persisted face ID
                enrollmentMediaId: mediaRecord.id, // Reference to the media record
                faceId: detectedFace.faceId,
                faceRectangle: detectedFace.faceRectangle,
                faceAttributes: detectedFace.faceAttributes,
                enrollmentConfidence: detectedFace.confidence || 0.8,
                isActive: true,
            });
            res.status(http_status_codes_1.StatusCodes.CREATED).json({
                success: true,
                message: "Face enrolled successfully",
                data: {
                    profile: faceProfile,
                    faceDetection: detectedFace,
                    mediaRecord,
                    quota: {
                        used: existingFaceUploads + 1,
                        max: MAX_FACE_PHOTOS,
                        remaining: MAX_FACE_PHOTOS - (existingFaceUploads + 1),
                    },
                },
            });
        }
    }
    catch (error) {
        console.error("Submit face enrollment from S3 error:", error);
        next(error);
    }
};
exports.submitFaceEnrollmentFromS3 = submitFaceEnrollmentFromS3;
