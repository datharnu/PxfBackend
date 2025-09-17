"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceProcessingService = void 0;
const eventMedia_1 = __importDefault(require("../models/eventMedia"));
const faceDetection_1 = __importDefault(require("../models/faceDetection"));
const userFaceProfile_1 = __importDefault(require("../models/userFaceProfile"));
const azureFaceService_1 = __importDefault(require("./azureFaceService"));
class FaceProcessingService {
    /**
     * Process media for face detection and identification
     */
    static async processMediaForFaces(mediaId) {
        try {
            // Find the media
            const media = await eventMedia_1.default.findByPk(mediaId, {
                include: [
                    {
                        model: require("../models/event").default,
                        as: "event",
                        attributes: ["id", "title"],
                    },
                ],
            });
            if (!media) {
                throw new Error("Media not found");
            }
            // Only process images for now (videos require frame extraction)
            if (media.mediaType !== "image") {
                return {
                    success: true,
                    facesDetected: 0,
                    facesIdentified: 0,
                };
            }
            // Validate image URL
            const isValidUrl = await azureFaceService_1.default.validateImageUrl(media.mediaUrl);
            if (!isValidUrl) {
                throw new Error("Invalid or inaccessible media URL");
            }
            // Detect faces in the image
            const faceDetections = await azureFaceService_1.default.detectFacesFromUrl(media.mediaUrl);
            if (faceDetections.length === 0) {
                return {
                    success: true,
                    facesDetected: 0,
                    facesIdentified: 0,
                };
            }
            // Store face detections in database
            const faceDetectionRecords = [];
            for (const detection of faceDetections) {
                const faceRecord = await faceDetection_1.default.create({
                    userId: media.uploadedBy,
                    eventId: media.eventId,
                    mediaId: media.id,
                    faceId: detection.faceId,
                    faceRectangle: detection.faceRectangle,
                    faceAttributes: detection.faceAttributes,
                    confidence: detection.confidence || 1.0,
                    isIdentified: false,
                });
                faceDetectionRecords.push(faceRecord);
            }
            // Try to identify faces if person group exists and is trained
            let identifiedCount = 0;
            try {
                const trainingStatus = await azureFaceService_1.default.getPersonGroupTrainingStatus(media.eventId);
                if (trainingStatus === "succeeded") {
                    const faceIds = faceDetections.map((d) => d.faceId);
                    const identificationResults = await azureFaceService_1.default.identifyFaces(media.eventId, faceIds);
                    for (const result of identificationResults) {
                        if (result.candidates.length > 0) {
                            const bestCandidate = result.candidates[0];
                            // Find the corresponding face detection record
                            const faceRecord = faceDetectionRecords.find((f) => f.faceId === result.faceId);
                            if (faceRecord && bestCandidate.confidence > 0.5) {
                                // Get person information to find the user
                                const person = await azureFaceService_1.default.getPerson(media.eventId, bestCandidate.personId);
                                const userId = person.userData?.replace("User: ", "");
                                if (userId) {
                                    await faceRecord.update({
                                        isIdentified: true,
                                        identifiedUserId: userId,
                                    });
                                    identifiedCount++;
                                }
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error("Error during face identification:", error);
                // Continue even if identification fails
            }
            return {
                success: true,
                facesDetected: faceDetections.length,
                facesIdentified: identifiedCount,
            };
        }
        catch (error) {
            console.error("Face processing error:", error);
            return {
                success: false,
                facesDetected: 0,
                facesIdentified: 0,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Process multiple media files for face detection
     */
    static async processMultipleMediaForFaces(mediaIds) {
        const results = [];
        for (const mediaId of mediaIds) {
            const result = await this.processMediaForFaces(mediaId);
            results.push(result);
        }
        return results;
    }
    /**
     * Get media with faces for a specific user in an event
     * Uses custom face matching for detection-only mode
     */
    static async getMediaWithUserFaces(eventId, userId) {
        try {
            // Get user's face profile for this event
            const userFaceProfile = await userFaceProfile_1.default.findOne({
                where: {
                    eventId,
                    userId,
                    isActive: true,
                },
            });
            if (!userFaceProfile) {
                console.log("No face profile found for user:", userId);
                return [];
            }
            // Get all face detections in this event
            const faceDetections = await faceDetection_1.default.findAll({
                where: {
                    eventId,
                    isActive: true,
                },
                include: [
                    {
                        model: eventMedia_1.default,
                        as: "media",
                        attributes: [
                            "id",
                            "mediaUrl",
                            "fileName",
                            "mediaType",
                            "createdAt",
                        ],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
            // For now, return all media with faces (we'll improve matching later)
            const matchingMedia = new Map();
            console.log(`Found ${faceDetections.length} face detections for event ${eventId}`);
            console.log(`User face profile:`, userFaceProfile.faceRectangle);
            faceDetections.forEach((detection) => {
                const media = detection.media;
                if (!media)
                    return;
                // Calculate face rectangle similarity
                const similarity = this.calculateFaceSimilarity(userFaceProfile.faceRectangle, detection.faceRectangle);
                console.log(`Face detection similarity: ${similarity.toFixed(3)} for media ${media.id}`);
                // For debugging, let's include all faces for now
                if (similarity > 0.1) { // Very low threshold to see all matches
                    if (!matchingMedia.has(media.id)) {
                        matchingMedia.set(media.id, {
                            ...media.toJSON(),
                            faceDetections: [],
                        });
                    }
                    matchingMedia.get(media.id).faceDetections.push({
                        id: detection.id,
                        faceId: detection.faceId,
                        faceRectangle: detection.faceRectangle,
                        confidence: detection.confidence,
                        faceAttributes: detection.faceAttributes,
                        similarity: similarity,
                        createdAt: detection.createdAt,
                    });
                }
            });
            console.log(`Returning ${matchingMedia.size} media items with faces`);
            return Array.from(matchingMedia.values());
        }
        catch (error) {
            console.error("Error getting media with user faces:", error);
            throw error;
        }
    }
    /**
     * Calculate face rectangle similarity
     */
    static calculateFaceSimilarity(face1, face2) {
        if (!face1 || !face2)
            return 0;
        // Calculate area similarity
        const area1 = face1.width * face1.height;
        const area2 = face2.width * face2.height;
        const areaSimilarity = 1 - Math.abs(area1 - area2) / Math.max(area1, area2);
        // Calculate position similarity (normalized)
        const positionSimilarity = 1 -
            (Math.abs(face1.left - face2.left) + Math.abs(face1.top - face2.top)) /
                (Math.max(face1.width, face2.width) +
                    Math.max(face1.height, face2.height));
        // Calculate aspect ratio similarity
        const aspectRatio1 = face1.width / face1.height;
        const aspectRatio2 = face2.width / face2.height;
        const aspectRatioSimilarity = 1 -
            Math.abs(aspectRatio1 - aspectRatio2) /
                Math.max(aspectRatio1, aspectRatio2);
        // Weighted average
        return (areaSimilarity * 0.4 +
            positionSimilarity * 0.3 +
            aspectRatioSimilarity * 0.3);
    }
    /**
     * Get all faces detected in an event
     */
    static async getEventFaceDetections(eventId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const { count, rows: faceDetections } = await faceDetection_1.default.findAndCountAll({
                where: {
                    eventId,
                    isActive: true,
                },
                include: [
                    {
                        model: eventMedia_1.default,
                        as: "media",
                        attributes: [
                            "id",
                            "mediaUrl",
                            "fileName",
                            "mediaType",
                            "createdAt",
                        ],
                    },
                    {
                        model: require("../models/user").default,
                        as: "identifiedUser",
                        attributes: ["id", "fullname", "email"],
                    },
                ],
                order: [["createdAt", "DESC"]],
                limit,
                offset,
            });
            return {
                faceDetections,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            };
        }
        catch (error) {
            console.error("Error getting event face detections:", error);
            throw error;
        }
    }
    /**
     * Get face detection statistics for an event
     */
    static async getEventFaceStats(eventId) {
        try {
            const totalDetections = await faceDetection_1.default.count({
                where: {
                    eventId,
                    isActive: true,
                },
            });
            const identifiedDetections = await faceDetection_1.default.count({
                where: {
                    eventId,
                    isActive: true,
                    isIdentified: true,
                },
            });
            const uniqueUsers = await faceDetection_1.default.count({
                where: {
                    eventId,
                    isActive: true,
                    isIdentified: true,
                },
                distinct: true,
                col: "identifiedUserId",
            });
            const mediaWithFaces = await faceDetection_1.default.count({
                where: {
                    eventId,
                    isActive: true,
                },
                distinct: true,
                col: "mediaId",
            });
            const totalFaceProfiles = await userFaceProfile_1.default.count({
                where: {
                    eventId,
                    isActive: true,
                },
            });
            return {
                totalDetections,
                identifiedDetections,
                unidentifiedDetections: totalDetections - identifiedDetections,
                uniqueUsers,
                mediaWithFaces,
                totalFaceProfiles,
                identificationRate: totalDetections > 0
                    ? (identifiedDetections / totalDetections) * 100
                    : 0,
            };
        }
        catch (error) {
            console.error("Error getting event face stats:", error);
            throw error;
        }
    }
    /**
     * Retrain face identification for an event
     */
    static async retrainEventFaceIdentification(eventId) {
        try {
            await azureFaceService_1.default.trainPersonGroup(eventId);
            return true;
        }
        catch (error) {
            console.error("Error retraining face identification:", error);
            return false;
        }
    }
}
exports.FaceProcessingService = FaceProcessingService;
exports.default = FaceProcessingService;
