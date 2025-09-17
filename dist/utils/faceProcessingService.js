"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceProcessingService = void 0;
const eventMedia_1 = __importDefault(require("../models/eventMedia"));
const faceDetection_1 = __importDefault(require("../models/faceDetection"));
const userFaceProfile_1 = __importDefault(require("../models/userFaceProfile"));
const googleVisionService_1 = __importDefault(require("./googleVisionService"));
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
            const isValidUrl = await googleVisionService_1.default.validateImageUrl(media.mediaUrl);
            if (!isValidUrl) {
                throw new Error("Invalid or inaccessible media URL");
            }
            // Detect faces in the image
            const faceDetections = await googleVisionService_1.default.detectFacesFromUrl(media.mediaUrl);
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
                // Google Vision doesn't require training
                const trainingStatus = "succeeded";
                if (trainingStatus === "succeeded") {
                    const faceIds = faceDetections.map((d) => d.faceId);
                    // Google Vision doesn't have identifyFaces method
                    const identificationResults = [];
                    for (const result of identificationResults) {
                        if (result.candidates.length > 0) {
                            const bestCandidate = result.candidates[0];
                            // Find the corresponding face detection record
                            const faceRecord = faceDetectionRecords.find((f) => f.faceId === result.faceId);
                            if (faceRecord && bestCandidate.confidence > 0.5) {
                                // Google Vision doesn't have getPerson method
                                const person = { userData: `User: ${bestCandidate.personId}` };
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
                // Calculate advanced face similarity
                const similarity = this.calculateAdvancedFaceSimilarity(userFaceProfile.faceRectangle, detection.faceRectangle, userFaceProfile.faceAttributes, detection.faceAttributes);
                console.log(`Face detection similarity: ${similarity.toFixed(3)} for media ${media.id} (${media.fileName})`);
                console.log(`  User face: ${JSON.stringify(userFaceProfile.faceRectangle)}`);
                console.log(`  Detection face: ${JSON.stringify(detection.faceRectangle)}`);
                console.log(`  Detection confidence: ${detection.confidence}`);
                // Use a higher threshold for better accuracy
                if (similarity > 0.75) {
                    // Moderate threshold - may need manual confirmation
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
     * Calculate advanced face similarity using multiple criteria
     */
    static calculateAdvancedFaceSimilarity(face1, face2, attributes1, attributes2) {
        if (!face1 || !face2)
            return 0;
        // Basic rectangle similarity
        const rectangleSimilarity = this.calculateFaceSimilarity(face1, face2);
        // If we have face attributes, use them for additional matching
        let attributeSimilarity = 0;
        if (attributes1 && attributes2) {
            // Compare glasses
            if (attributes1.glasses && attributes2.glasses) {
                if (attributes1.glasses === attributes2.glasses) {
                    attributeSimilarity += 0.3;
                }
            }
            // Compare emotions (if available)
            if (attributes1.emotion && attributes2.emotion) {
                const emotion1 = attributes1.emotion;
                const emotion2 = attributes2.emotion;
                // Find dominant emotion for each face
                const emotions1 = Object.keys(emotion1).map((key) => ({
                    emotion: key,
                    value: emotion1[key],
                }));
                const emotions2 = Object.keys(emotion2).map((key) => ({
                    emotion: key,
                    value: emotion2[key],
                }));
                const dominant1 = emotions1.reduce((max, current) => current.value > max.value ? current : max);
                const dominant2 = emotions2.reduce((max, current) => current.value > max.value ? current : max);
                if (dominant1.emotion === dominant2.emotion) {
                    attributeSimilarity += 0.2;
                }
            }
        }
        // Combine rectangle similarity with attribute similarity
        const finalSimilarity = Math.min(1.0, rectangleSimilarity * 0.8 + attributeSimilarity * 0.2);
        // Additional filtering: reject if face sizes are too different
        const area1 = face1.width * face1.height;
        const area2 = face2.width * face2.height;
        const sizeRatio = Math.min(area1, area2) / Math.max(area1, area2);
        // If faces are very different in size, reduce similarity significantly
        if (sizeRatio < 0.2) {
            console.log(`Face size ratio too different: ${sizeRatio.toFixed(3)}, reducing similarity`);
            return finalSimilarity * 0.3; // Significantly reduce similarity for very different sizes
        }
        // Additional filtering: reject if aspect ratios are too different
        const aspectRatio1 = face1.width / face1.height;
        const aspectRatio2 = face2.width / face2.height;
        const aspectRatioDiff = Math.abs(aspectRatio1 - aspectRatio2) / Math.max(aspectRatio1, aspectRatio2);
        if (aspectRatioDiff > 0.5) {
            console.log(`Face aspect ratio too different: ${aspectRatioDiff.toFixed(3)}, reducing similarity`);
            return finalSimilarity * 0.5; // Reduce similarity for very different aspect ratios
        }
        return finalSimilarity;
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
            // Google Vision doesn't require training
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
