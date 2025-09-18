// import EventMedia from "../models/eventMedia";
// import FaceDetection from "../models/faceDetection";
// import UserFaceProfile from "../models/userFaceProfile";
// import GoogleVisionService from "./googleVisionService";

// export interface FaceProcessingResult {
//   success: boolean;
//   facesDetected: number;
//   facesIdentified: number;
//   error?: string;
// }

// export class FaceProcessingService {
//   /**
//    * Process media for face detection and identification
//    */
//   static async processMediaForFaces(
//     mediaId: string
//   ): Promise<FaceProcessingResult> {
//     try {
//       // Find the media
//       const media = await EventMedia.findByPk(mediaId, {
//         include: [
//           {
//             model: require("../models/event").default,
//             as: "event",
//             attributes: ["id", "title"],
//           },
//         ],
//       });

//       if (!media) {
//         throw new Error("Media not found");
//       }

//       // Only process images for now (videos require frame extraction)
//       if (media.mediaType !== "image") {
//         return {
//           success: true,
//           facesDetected: 0,
//           facesIdentified: 0,
//         };
//       }

//       // Validate image URL
//       const isValidUrl = await GoogleVisionService.validateImageUrl(
//         media.mediaUrl
//       );
//       if (!isValidUrl) {
//         throw new Error("Invalid or inaccessible media URL");
//       }

//       // Detect faces in the image
//       const faceDetections = await GoogleVisionService.detectFacesFromUrl(
//         media.mediaUrl
//       );

//       if (faceDetections.length === 0) {
//         return {
//           success: true,
//           facesDetected: 0,
//           facesIdentified: 0,
//         };
//       }

//       // Store face detections in database
//       const faceDetectionRecords = [];
//       for (const detection of faceDetections) {
//         const faceRecord = await FaceDetection.create({
//           userId: media.uploadedBy,
//           eventId: media.eventId,
//           mediaId: media.id,
//           faceId: detection.faceId,
//           faceRectangle: detection.faceRectangle,
//           faceAttributes: detection.faceAttributes,
//           confidence: detection.confidence || 1.0,
//           isIdentified: false,
//         });
//         faceDetectionRecords.push(faceRecord);
//       }

//       // Try to identify faces if person group exists and is trained
//       let identifiedCount = 0;
//       try {
//         // Google Vision doesn't require training
//         const trainingStatus = "succeeded";

//         if (trainingStatus === "succeeded") {
//           const faceIds = faceDetections.map((d) => d.faceId);
//           // Google Vision doesn't have identifyFaces method
//           const identificationResults: any[] = [];

//           for (const result of identificationResults) {
//             if (result.candidates.length > 0) {
//               const bestCandidate = result.candidates[0];

//               // Find the corresponding face detection record
//               const faceRecord = faceDetectionRecords.find(
//                 (f) => f.faceId === result.faceId
//               );
//               if (faceRecord && bestCandidate.confidence > 0.5) {
//                 // Google Vision doesn't have getPerson method
//                 const person = { userData: `User: ${bestCandidate.personId}` };
//                 const userId = person.userData?.replace("User: ", "");

//                 if (userId) {
//                   await faceRecord.update({
//                     isIdentified: true,
//                     identifiedUserId: userId,
//                   });
//                   identifiedCount++;
//                 }
//               }
//             }
//           }
//         }
//       } catch (error) {
//         console.error("Error during face identification:", error);
//         // Continue even if identification fails
//       }

//       return {
//         success: true,
//         facesDetected: faceDetections.length,
//         facesIdentified: identifiedCount,
//       };
//     } catch (error) {
//       console.error("Face processing error:", error);
//       return {
//         success: false,
//         facesDetected: 0,
//         facesIdentified: 0,
//         error: error instanceof Error ? error.message : "Unknown error",
//       };
//     }
//   }

//   /**
//    * Process multiple media files for face detection
//    */
//   static async processMultipleMediaForFaces(
//     mediaIds: string[]
//   ): Promise<FaceProcessingResult[]> {
//     const results: FaceProcessingResult[] = [];

//     for (const mediaId of mediaIds) {
//       const result = await this.processMediaForFaces(mediaId);
//       results.push(result);
//     }

//     return results;
//   }

//   /**
//    * Get media with faces for a specific user in an event
//    * Uses custom face matching for detection-only mode
//    */
//   static async getMediaWithUserFaces(
//     eventId: string,
//     userId: string
//   ): Promise<any[]> {
//     try {
//       // Get user's face profile for this event
//       const userFaceProfile = await UserFaceProfile.findOne({
//         where: {
//           eventId,
//           userId,
//           isActive: true,
//         },
//       });

//       if (!userFaceProfile) {
//         console.log("No face profile found for user:", userId);
//         return [];
//       }

//       // Get all face detections in this event
//       const faceDetections = await FaceDetection.findAll({
//         where: {
//           eventId,
//           isActive: true,
//         },
//         include: [
//           {
//             model: EventMedia,
//             as: "media",
//             attributes: [
//               "id",
//               "mediaUrl",
//               "fileName",
//               "mediaType",
//               "createdAt",
//             ],
//           },
//         ],
//         order: [["createdAt", "DESC"]],
//       });

//       // For now, return all media with faces (we'll improve matching later)
//       const matchingMedia = new Map();

//       console.log(
//         `Found ${faceDetections.length} face detections for event ${eventId}`
//       );
//       console.log(`User face profile:`, userFaceProfile.faceRectangle);

//       faceDetections.forEach((detection) => {
//         const media = detection.media;
//         if (!media) return;

//         // Calculate advanced face similarity
//         const similarity = this.calculateAdvancedFaceSimilarity(
//           userFaceProfile.faceRectangle,
//           detection.faceRectangle,
//           userFaceProfile.faceAttributes,
//           detection.faceAttributes
//         );

//         console.log(
//           `Face detection similarity: ${similarity.toFixed(3)} for media ${
//             media.id
//           }`
//         );

//         // Use a moderate threshold - we'll improve this with manual confirmation later
//         if (similarity > 0.5) {
//           // Moderate threshold - may need manual confirmation
//           if (!matchingMedia.has(media.id)) {
//             matchingMedia.set(media.id, {
//               ...media.toJSON(),
//               faceDetections: [],
//             });
//           }

//           matchingMedia.get(media.id).faceDetections.push({
//             id: detection.id,
//             faceId: detection.faceId,
//             faceRectangle: detection.faceRectangle,
//             confidence: detection.confidence,
//             faceAttributes: detection.faceAttributes,
//             similarity: similarity,
//             createdAt: detection.createdAt,
//           });
//         }
//       });

//       console.log(`Returning ${matchingMedia.size} media items with faces`);

//       return Array.from(matchingMedia.values());
//     } catch (error) {
//       console.error("Error getting media with user faces:", error);
//       throw error;
//     }
//   }

//   /**
//    * Calculate face rectangle similarity
//    */
//   private static calculateFaceSimilarity(face1: any, face2: any): number {
//     if (!face1 || !face2) return 0;

//     // Calculate area similarity
//     const area1 = face1.width * face1.height;
//     const area2 = face2.width * face2.height;
//     const areaSimilarity = 1 - Math.abs(area1 - area2) / Math.max(area1, area2);

//     // Calculate position similarity (normalized)
//     const positionSimilarity =
//       1 -
//       (Math.abs(face1.left - face2.left) + Math.abs(face1.top - face2.top)) /
//         (Math.max(face1.width, face2.width) +
//           Math.max(face1.height, face2.height));

//     // Calculate aspect ratio similarity
//     const aspectRatio1 = face1.width / face1.height;
//     const aspectRatio2 = face2.width / face2.height;
//     const aspectRatioSimilarity =
//       1 -
//       Math.abs(aspectRatio1 - aspectRatio2) /
//         Math.max(aspectRatio1, aspectRatio2);

//     // Weighted average
//     return (
//       areaSimilarity * 0.4 +
//       positionSimilarity * 0.3 +
//       aspectRatioSimilarity * 0.3
//     );
//   }

//   /**
//    * Calculate advanced face similarity using multiple criteria
//    */
//   private static calculateAdvancedFaceSimilarity(
//     face1: any,
//     face2: any,
//     attributes1?: any,
//     attributes2?: any
//   ): number {
//     if (!face1 || !face2) return 0;

//     // Basic rectangle similarity
//     const rectangleSimilarity = this.calculateFaceSimilarity(face1, face2);

//     // If we have face attributes, use them for additional matching
//     let attributeSimilarity = 0;
//     if (attributes1 && attributes2) {
//       // Compare glasses
//       if (attributes1.glasses && attributes2.glasses) {
//         if (attributes1.glasses === attributes2.glasses) {
//           attributeSimilarity += 0.3;
//         }
//       }

//       // Compare emotions (if available)
//       if (attributes1.emotion && attributes2.emotion) {
//         const emotion1 = attributes1.emotion;
//         const emotion2 = attributes2.emotion;

//         // Find dominant emotion for each face
//         const emotions1 = Object.keys(emotion1).map((key) => ({
//           emotion: key,
//           value: emotion1[key],
//         }));
//         const emotions2 = Object.keys(emotion2).map((key) => ({
//           emotion: key,
//           value: emotion2[key],
//         }));

//         const dominant1 = emotions1.reduce((max, current) =>
//           current.value > max.value ? current : max
//         );
//         const dominant2 = emotions2.reduce((max, current) =>
//           current.value > max.value ? current : max
//         );

//         if (dominant1.emotion === dominant2.emotion) {
//           attributeSimilarity += 0.2;
//         }
//       }
//     }

//     // Combine rectangle similarity with attribute similarity
//     return Math.min(1.0, rectangleSimilarity * 0.7 + attributeSimilarity * 0.3);
//   }

//   /**
//    * Get all faces detected in an event
//    */
//   static async getEventFaceDetections(
//     eventId: string,
//     page: number = 1,
//     limit: number = 20
//   ): Promise<any> {
//     try {
//       const offset = (page - 1) * limit;

//       const { count, rows: faceDetections } =
//         await FaceDetection.findAndCountAll({
//           where: {
//             eventId,
//             isActive: true,
//           },
//           include: [
//             {
//               model: EventMedia,
//               as: "media",
//               attributes: [
//                 "id",
//                 "mediaUrl",
//                 "fileName",
//                 "mediaType",
//                 "createdAt",
//               ],
//             },
//             {
//               model: require("../models/user").default,
//               as: "identifiedUser",
//               attributes: ["id", "fullname", "email"],
//             },
//           ],
//           order: [["createdAt", "DESC"]],
//           limit,
//           offset,
//         });

//       return {
//         faceDetections,
//         pagination: {
//           page,
//           limit,
//           total: count,
//           totalPages: Math.ceil(count / limit),
//         },
//       };
//     } catch (error) {
//       console.error("Error getting event face detections:", error);
//       throw error;
//     }
//   }

//   /**
//    * Get face detection statistics for an event
//    */
//   static async getEventFaceStats(eventId: string): Promise<any> {
//     try {
//       const totalDetections = await FaceDetection.count({
//         where: {
//           eventId,
//           isActive: true,
//         },
//       });

//       const identifiedDetections = await FaceDetection.count({
//         where: {
//           eventId,
//           isActive: true,
//           isIdentified: true,
//         },
//       });

//       const uniqueUsers = await FaceDetection.count({
//         where: {
//           eventId,
//           isActive: true,
//           isIdentified: true,
//         },
//         distinct: true,
//         col: "identifiedUserId",
//       });

//       const mediaWithFaces = await FaceDetection.count({
//         where: {
//           eventId,
//           isActive: true,
//         },
//         distinct: true,
//         col: "mediaId",
//       });

//       const totalFaceProfiles = await UserFaceProfile.count({
//         where: {
//           eventId,
//           isActive: true,
//         },
//       });

//       return {
//         totalDetections,
//         identifiedDetections,
//         unidentifiedDetections: totalDetections - identifiedDetections,
//         uniqueUsers,
//         mediaWithFaces,
//         totalFaceProfiles,
//         identificationRate:
//           totalDetections > 0
//             ? (identifiedDetections / totalDetections) * 100
//             : 0,
//       };
//     } catch (error) {
//       console.error("Error getting event face stats:", error);
//       throw error;
//     }
//   }

//   /**
//    * Retrain face identification for an event
//    */
//   static async retrainEventFaceIdentification(
//     eventId: string
//   ): Promise<boolean> {
//     try {
//       // Google Vision doesn't require training
//       return true;
//     } catch (error) {
//       console.error("Error retraining face identification:", error);
//       return false;
//     }
//   }
// }

// export default FaceProcessingService;

import EventMedia from "../models/eventMedia";
import FaceDetection from "../models/faceDetection";
import UserFaceProfile from "../models/userFaceProfile";
import GoogleVisionService from "./googleVisionService";

export interface FaceProcessingResult {
  success: boolean;
  facesDetected: number;
  facesIdentified: number;
  error?: string;
}

export interface FaceMatchResult {
  mediaId: string;
  mediaUrl: string;
  fileName: string;
  mediaType: string;
  matchedFaces: {
    faceId: string;
    confidence: number;
    similarity: number;
    faceRectangle: any;
  }[];
  overallConfidence: number;
}

export class FaceProcessingService {
  /**
   * Process media for face detection and identification
   */
  static async processMediaForFaces(
    mediaId: string
  ): Promise<FaceProcessingResult> {
    try {
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

      // Process both images and videos
      let faceDetections: any[] = [];

      if (media.mediaType === "image") {
        // Validate image URL
        const isValidUrl = await GoogleVisionService.validateImageUrl(
          media.mediaUrl
        );
        if (!isValidUrl) {
          throw new Error("Invalid or inaccessible media URL");
        }

        // Detect faces in the image
        faceDetections = await GoogleVisionService.detectFacesFromUrl(
          media.mediaUrl
        );
      } else if (media.mediaType === "video") {
        // For videos, extract frames and process them
        faceDetections = await this.processVideoForFaces(media.mediaUrl);
      }

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
          frameTimestamp: detection.frameTimestamp || null, // For videos
        });
        faceDetectionRecords.push(faceRecord);
      }

      // Try to identify faces against all user face profiles
      let identifiedCount = 0;
      try {
        identifiedCount = await this.identifyFacesInMedia(
          media.eventId,
          faceDetectionRecords
        );
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
   * Process video for face detection by extracting frames
   */
  private static async processVideoForFaces(videoUrl: string): Promise<any[]> {
    try {
      // This is a simplified version - in production, you'd use ffmpeg or similar
      // to extract frames from video at regular intervals
      console.log("Processing video for faces:", videoUrl);

      // For now, return empty array - you'll need to implement video frame extraction
      // using ffmpeg or a similar tool to extract frames at intervals (e.g., every 5 seconds)
      // then process each frame for face detection

      return [];
    } catch (error) {
      console.error("Error processing video:", error);
      return [];
    }
  }

  /**
   * Identify faces in media against all user face profiles in the event
   */
  private static async identifyFacesInMedia(
    eventId: string,
    faceDetectionRecords: any[]
  ): Promise<number> {
    let identifiedCount = 0;

    // Get all user face profiles for this event
    const userFaceProfiles = await UserFaceProfile.findAll({
      where: {
        eventId,
        isActive: true,
      },
    });

    if (userFaceProfiles.length === 0) {
      console.log("No user face profiles found for event:", eventId);
      return 0;
    }

    // Compare each detected face against all user profiles
    for (const faceRecord of faceDetectionRecords) {
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const userProfile of userFaceProfiles) {
        const similarity = this.calculateAdvancedFaceSimilarity(
          userProfile.faceRectangle,
          faceRecord.faceRectangle,
          userProfile.faceAttributes,
          faceRecord.faceAttributes
        );

        if (similarity > bestSimilarity && similarity > 0.6) {
          // Higher threshold for identification
          bestSimilarity = similarity;
          bestMatch = userProfile;
        }
      }

      if (bestMatch && bestSimilarity > 0.6) {
        await faceRecord.update({
          isIdentified: true,
          identifiedUserId: bestMatch.userId,
          similarity: bestSimilarity,
        });
        identifiedCount++;
      }
    }

    return identifiedCount;
  }

  /**
   * Find all media containing a specific face model/profile
   */
  static async findMediaWithFaceModel(
    eventId: string,
    faceModelData: {
      faceRectangle: any;
      faceAttributes?: any;
    },
    similarityThreshold: number = 0.5
  ): Promise<FaceMatchResult[]> {
    try {
      console.log("Finding media with face model for event:", eventId);

      // Get all face detections in this event
      const faceDetections = await FaceDetection.findAll({
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
        ],
        order: [["createdAt", "DESC"]],
      });

      const matchingMedia: Map<string, FaceMatchResult> = new Map();

      console.log(`Analyzing ${faceDetections.length} face detections`);

      for (const detection of faceDetections) {
        const media = detection.media;
        if (!media) continue;

        // Calculate similarity between the face model and detected face
        const similarity = this.calculateAdvancedFaceSimilarity(
          faceModelData.faceRectangle,
          detection.faceRectangle,
          faceModelData.faceAttributes,
          detection.faceAttributes
        );

        console.log(
          `Similarity: ${similarity.toFixed(3)} for media ${media.id}`
        );

        if (similarity >= similarityThreshold) {
          const mediaId = media.id;

          if (!matchingMedia.has(mediaId)) {
            matchingMedia.set(mediaId, {
              mediaId: media.id,
              mediaUrl: media.mediaUrl,
              fileName: media.fileName,
              mediaType: media.mediaType,
              matchedFaces: [],
              overallConfidence: 0,
            });
          }

          const mediaMatch = matchingMedia.get(mediaId)!;
          mediaMatch.matchedFaces.push({
            faceId: detection.faceId,
            confidence: detection.confidence,
            similarity: similarity,
            faceRectangle: detection.faceRectangle,
          });

          // Update overall confidence (use highest similarity)
          mediaMatch.overallConfidence = Math.max(
            mediaMatch.overallConfidence,
            similarity
          );
        }
      }

      // Sort by overall confidence (best matches first)
      const results = Array.from(matchingMedia.values()).sort(
        (a, b) => b.overallConfidence - a.overallConfidence
      );

      console.log(`Found ${results.length} media items with matching faces`);
      return results;
    } catch (error) {
      console.error("Error finding media with face model:", error);
      throw error;
    }
  }

  /**
   * Get media with faces for a specific user in an event
   */
  static async getMediaWithUserFaces(
    eventId: string,
    userId: string,
    similarityThreshold: number = 0.5
  ): Promise<FaceMatchResult[]> {
    try {
      // Get user's face profile for this event
      const userFaceProfile = await UserFaceProfile.findOne({
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

      // Use the face model finder with the user's profile
      return await this.findMediaWithFaceModel(
        eventId,
        {
          faceRectangle: userFaceProfile.faceRectangle,
          faceAttributes: userFaceProfile.faceAttributes,
        },
        similarityThreshold
      );
    } catch (error) {
      console.error("Error getting media with user faces:", error);
      throw error;
    }
  }

  /**
   * Upload and process a face model image to find matching media
   */
  static async uploadFaceModelAndFindMatches(
    eventId: string,
    faceModelImageUrl: string,
    similarityThreshold: number = 0.5
  ): Promise<FaceMatchResult[]> {
    try {
      console.log("Processing face model image:", faceModelImageUrl);

      // Detect faces in the uploaded face model image
      const faceDetections = await GoogleVisionService.detectFacesFromUrl(
        faceModelImageUrl
      );

      if (faceDetections.length === 0) {
        throw new Error("No faces detected in the face model image");
      }

      if (faceDetections.length > 1) {
        console.warn(
          "Multiple faces detected, using the first one as the model"
        );
      }

      // Use the first detected face as the model
      const faceModel = faceDetections[0];

      // Find all media with similar faces
      return await this.findMediaWithFaceModel(
        eventId,
        {
          faceRectangle: faceModel.faceRectangle,
          faceAttributes: faceModel.faceAttributes,
        },
        similarityThreshold
      );
    } catch (error) {
      console.error("Error processing face model and finding matches:", error);
      throw error;
    }
  }

  /**
   * Calculate advanced face similarity using multiple criteria
   */
  private static calculateAdvancedFaceSimilarity(
    face1: any,
    face2: any,
    attributes1?: any,
    attributes2?: any
  ): number {
    if (!face1 || !face2) return 0;

    // Basic rectangle similarity (position, size, aspect ratio)
    const rectangleSimilarity = this.calculateFaceSimilarity(face1, face2);

    // Face attributes similarity
    let attributeSimilarity = 0;
    if (attributes1 && attributes2) {
      // Compare glasses
      if (attributes1.glasses && attributes2.glasses) {
        if (attributes1.glasses === attributes2.glasses) {
          attributeSimilarity += 0.2;
        }
      }

      // Compare emotions (if available)
      if (attributes1.emotion && attributes2.emotion) {
        const emotionSimilarity = this.calculateEmotionSimilarity(
          attributes1.emotion,
          attributes2.emotion
        );
        attributeSimilarity += emotionSimilarity * 0.3;
      }
    }

    // Weighted combination
    const finalSimilarity = Math.min(
      1.0,
      rectangleSimilarity * 0.7 + attributeSimilarity * 0.3
    );

    // Apply additional boost for very similar rectangular matches
    if (rectangleSimilarity > 0.8) {
      return Math.min(1.0, finalSimilarity * 1.1);
    }

    return finalSimilarity;
  }

  /**
   * Calculate emotion similarity between two faces
   */
  private static calculateEmotionSimilarity(
    emotion1: any,
    emotion2: any
  ): number {
    const emotions = [
      "anger",
      "contempt",
      "disgust",
      "fear",
      "happiness",
      "neutral",
      "sadness",
      "surprise",
    ];
    let totalSimilarity = 0;

    for (const emotion of emotions) {
      const value1 = emotion1[emotion] || 0;
      const value2 = emotion2[emotion] || 0;
      const difference = Math.abs(value1 - value2);
      totalSimilarity += 1 - difference;
    }

    return totalSimilarity / emotions.length;
  }

  /**
   * Calculate face rectangle similarity
   */
  private static calculateFaceSimilarity(face1: any, face2: any): number {
    if (!face1 || !face2) return 0;

    // Normalize dimensions relative to image size (if available)
    const area1 = face1.width * face1.height;
    const area2 = face2.width * face2.height;

    if (area1 === 0 || area2 === 0) return 0;

    // Area similarity
    const areaSimilarity = 1 - Math.abs(area1 - area2) / Math.max(area1, area2);

    // Aspect ratio similarity
    const aspectRatio1 = face1.width / face1.height;
    const aspectRatio2 = face2.width / face2.height;
    const aspectRatioSimilarity =
      1 -
      Math.abs(aspectRatio1 - aspectRatio2) /
        Math.max(aspectRatio1, aspectRatio2);

    // Position similarity (less important for different photos)
    const maxDimension = Math.max(
      face1.width,
      face1.height,
      face2.width,
      face2.height
    );
    const positionSimilarity =
      maxDimension > 0
        ? Math.max(
            0,
            1 -
              (Math.abs(face1.left - face2.left) +
                Math.abs(face1.top - face2.top)) /
                (maxDimension * 2)
          )
        : 0;

    // Weighted combination - emphasize area and aspect ratio over position
    return (
      areaSimilarity * 0.5 +
      aspectRatioSimilarity * 0.35 +
      positionSimilarity * 0.15
    );
  }

  /**
   * Batch process multiple media files
   */
  static async processMultipleMediaForFaces(
    mediaIds: string[]
  ): Promise<FaceProcessingResult[]> {
    const results: FaceProcessingResult[] = [];

    for (const mediaId of mediaIds) {
      try {
        const result = await this.processMediaForFaces(mediaId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          facesDetected: 0,
          facesIdentified: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Get face detection statistics for an event
   */
  static async getEventFaceStats(eventId: string): Promise<any> {
    try {
      const totalDetections = await FaceDetection.count({
        where: { eventId, isActive: true },
      });

      const identifiedDetections = await FaceDetection.count({
        where: { eventId, isActive: true, isIdentified: true },
      });

      const uniqueUsers = await FaceDetection.count({
        where: { eventId, isActive: true, isIdentified: true },
        distinct: true,
        col: "identifiedUserId",
      });

      const mediaWithFaces = await FaceDetection.count({
        where: { eventId, isActive: true },
        distinct: true,
        col: "mediaId",
      });

      const totalFaceProfiles = await UserFaceProfile.count({
        where: { eventId, isActive: true },
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
   * Retrain face identification for an event
   */
  static async retrainEventFaceIdentification(
    eventId: string
  ): Promise<boolean> {
    try {
      // Google Vision doesn't require training
      return true;
    } catch (error) {
      console.error("Error retraining face identification:", error);
      return false;
    }
  }
}

export default FaceProcessingService;
