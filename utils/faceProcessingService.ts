import EventMedia from "../models/eventMedia";
import FaceDetection from "../models/faceDetection";
import UserFaceProfile from "../models/userFaceProfile";
import AzureFaceService from "./azureFaceService";

export interface FaceProcessingResult {
  success: boolean;
  facesDetected: number;
  facesIdentified: number;
  error?: string;
}

export class FaceProcessingService {
  /**
   * Process media for face detection and identification
   */
  static async processMediaForFaces(
    mediaId: string
  ): Promise<FaceProcessingResult> {
    try {
      // Find the media
      const media = await EventMedia.findByPk(mediaId, {
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
      const isValidUrl = await AzureFaceService.validateImageUrl(
        media.mediaUrl
      );
      if (!isValidUrl) {
        throw new Error("Invalid or inaccessible media URL");
      }

      // Detect faces in the image
      const faceDetections = await AzureFaceService.detectFacesFromUrl(
        media.mediaUrl
      );

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
        const faceRecord = await FaceDetection.create({
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
        const trainingStatus =
          await AzureFaceService.getPersonGroupTrainingStatus(media.eventId);

        if (trainingStatus === "succeeded") {
          const faceIds = faceDetections.map((d) => d.faceId);
          const identificationResults = await AzureFaceService.identifyFaces(
            media.eventId,
            faceIds
          );

          for (const result of identificationResults) {
            if (result.candidates.length > 0) {
              const bestCandidate = result.candidates[0];

              // Find the corresponding face detection record
              const faceRecord = faceDetectionRecords.find(
                (f) => f.faceId === result.faceId
              );
              if (faceRecord && bestCandidate.confidence > 0.5) {
                // Get person information to find the user
                const person = await AzureFaceService.getPerson(
                  media.eventId,
                  bestCandidate.personId
                );
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
      } catch (error) {
        console.error("Error during face identification:", error);
        // Continue even if identification fails
      }

      return {
        success: true,
        facesDetected: faceDetections.length,
        facesIdentified: identifiedCount,
      };
    } catch (error) {
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
  static async processMultipleMediaForFaces(
    mediaIds: string[]
  ): Promise<FaceProcessingResult[]> {
    const results: FaceProcessingResult[] = [];

    for (const mediaId of mediaIds) {
      const result = await this.processMediaForFaces(mediaId);
      results.push(result);
    }

    return results;
  }

  /**
   * Get media with faces for a specific user in an event
   */
  static async getMediaWithUserFaces(
    eventId: string,
    userId: string
  ): Promise<any[]> {
    try {
      // Find all face detections where the user is identified
      const faceDetections = await FaceDetection.findAll({
        where: {
          eventId,
          identifiedUserId: userId,
          isActive: true,
        },
        include: [
          {
            model: EventMedia,
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

      // Group by media to avoid duplicates
      const mediaMap = new Map();
      for (const detection of faceDetections) {
        const media = detection.media;
        if (media && !mediaMap.has(media.id)) {
          mediaMap.set(media.id, {
            ...media.toJSON(),
            faceDetections: [],
          });
        }

        if (media) {
          mediaMap.get(media.id).faceDetections.push({
            id: detection.id,
            faceId: detection.faceId,
            faceRectangle: detection.faceRectangle,
            confidence: detection.confidence,
            faceAttributes: detection.faceAttributes,
            createdAt: detection.createdAt,
          });
        }
      }

      return Array.from(mediaMap.values());
    } catch (error) {
      console.error("Error getting media with user faces:", error);
      throw error;
    }
  }

  /**
   * Get all faces detected in an event
   */
  static async getEventFaceDetections(
    eventId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const { count, rows: faceDetections } =
        await FaceDetection.findAndCountAll({
          where: {
            eventId,
            isActive: true,
          },
          include: [
            {
              model: EventMedia,
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
    } catch (error) {
      console.error("Error getting event face detections:", error);
      throw error;
    }
  }

  /**
   * Get face detection statistics for an event
   */
  static async getEventFaceStats(eventId: string): Promise<any> {
    try {
      const totalDetections = await FaceDetection.count({
        where: {
          eventId,
          isActive: true,
        },
      });

      const identifiedDetections = await FaceDetection.count({
        where: {
          eventId,
          isActive: true,
          isIdentified: true,
        },
      });

      const uniqueUsers = await FaceDetection.count({
        where: {
          eventId,
          isActive: true,
          isIdentified: true,
        },
        distinct: true,
        col: "identifiedUserId",
      });

      const mediaWithFaces = await FaceDetection.count({
        where: {
          eventId,
          isActive: true,
        },
        distinct: true,
        col: "mediaId",
      });

      const totalFaceProfiles = await UserFaceProfile.count({
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
        identificationRate:
          totalDetections > 0
            ? (identifiedDetections / totalDetections) * 100
            : 0,
      };
    } catch (error) {
      console.error("Error getting event face stats:", error);
      throw error;
    }
  }

  /**
   * Retrain face identification for an event
   */
  static async retrainEventFaceIdentification(
    eventId: string
  ): Promise<boolean> {
    try {
      await AzureFaceService.trainPersonGroup(eventId);
      return true;
    } catch (error) {
      console.error("Error retraining face identification:", error);
      return false;
    }
  }
}

export default FaceProcessingService;
