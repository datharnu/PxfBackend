import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import Event from "../models/event";
import EventMedia from "../models/eventMedia";
import User from "../models/user";
import FaceDetection from "../models/faceDetection";
import UserFaceProfile from "../models/userFaceProfile";
import BadRequestError from "../errors/badRequest";
import NotFoundError from "../errors/notFound";
import UnAuthorizedError from "../errors/unauthorized";
import AzureFaceService from "../utils/azureFaceService";

// Test Azure Face API connection
export const testAzureFaceAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Testing Azure Face API connection...");
    const isConnected = await AzureFaceService.testConnection();

    if (isConnected) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Azure Face API connection successful",
        connected: true,
      });
    } else {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        message: "Azure Face API connection failed",
        connected: false,
      });
    }
  } catch (error) {
    console.error("Azure Face API test error:", error);
    next(error);
  }
};

// Debug face detections for an event
export const debugFaceDetections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    // Get all face detections for this event
    const faceDetections = await FaceDetection.findAll({
      where: {
        eventId,
        isActive: true,
      },
      include: [
        {
          model: EventMedia,
          as: "media",
          attributes: ["id", "mediaUrl", "fileName", "mediaType"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Get user's face profile
    const userFaceProfile = await UserFaceProfile.findOne({
      where: {
        eventId,
        userId,
        isActive: true,
      },
    });

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Debug face detections error:", error);
    next(error);
  }
};

// Enroll user's face for an event
export const enrollUserFace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const { mediaId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    if (!mediaId) {
      throw new BadRequestError("Media ID is required for face enrollment");
    }

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    if (!event.isActive) {
      throw new BadRequestError("Event is not active");
    }

    // Find the media
    const media = await EventMedia.findOne({
      where: {
        id: mediaId,
        eventId,
        uploadedBy: userId,
        isActive: true,
      },
    });

    if (!media) {
      throw new NotFoundError(
        "Media not found or you don't have permission to use it"
      );
    }

    // Check if user already has a face profile for this event
    const existingProfile = await UserFaceProfile.findOne({
      where: {
        userId,
        eventId,
        isActive: true,
      },
    });

    if (existingProfile) {
      throw new BadRequestError(
        "You already have a face profile for this event"
      );
    }

    // Validate image URL
    const isValidUrl = await AzureFaceService.validateImageUrl(media.mediaUrl);
    if (!isValidUrl) {
      throw new BadRequestError("Invalid or inaccessible media URL");
    }

    // Detect faces in the image (detection only - no identification)
    const faceDetections = await AzureFaceService.detectFacesFromUrl(
      media.mediaUrl
    );

    if (faceDetections.length === 0) {
      throw new BadRequestError("No faces detected in the selected image");
    }

    if (faceDetections.length > 1) {
      throw new BadRequestError(
        "Multiple faces detected. Please select an image with only your face"
      );
    }

    const faceDetection = faceDetections[0];

    // Create user face profile record (detection only - no Azure identification)
    const faceProfile = await UserFaceProfile.create({
      userId,
      eventId,
      persistedFaceId: `detection_only_${userId}_${eventId}_${Date.now()}`, // Generate a local ID
      faceId: faceDetection.faceId,
      enrollmentMediaId: mediaId,
      faceRectangle: faceDetection.faceRectangle,
      faceAttributes: faceDetection.faceAttributes,
      enrollmentConfidence: faceDetection.confidence || 1.0,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Face enrolled successfully (detection only)",
      faceProfile: {
        id: faceProfile.id,
        userId: faceProfile.userId,
        eventId: faceProfile.eventId,
        enrollmentConfidence: faceProfile.enrollmentConfidence,
        faceAttributes: faceProfile.faceAttributes,
        createdAt: faceProfile.createdAt,
      },
      trainingStatus:
        "Face detection enabled. Note: Face identification requires Azure approval for Identification/Verification features.",
    });
  } catch (error) {
    console.error("Face enrollment error:", error);
    next(error);
  }
};

// Get user's face profile for an event
export const getUserFaceProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Find user's face profile
    const faceProfile = await UserFaceProfile.findOne({
      where: {
        userId,
        eventId,
        isActive: true,
      },
      include: [
        {
          model: EventMedia,
          as: "enrollmentMedia",
          attributes: ["id", "mediaUrl", "fileName", "createdAt"],
        },
      ],
    });

    if (!faceProfile) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No face profile found for this event",
        faceProfile: null,
      });
    }

    // Get training status
    let trainingStatus = "unknown";
    try {
      trainingStatus = await AzureFaceService.getPersonGroupTrainingStatus(
        eventId
      );
    } catch (error) {
      console.error("Error getting training status:", error);
    }

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get face profile error:", error);
    next(error);
  }
};

// Delete user's face profile
export const deleteUserFaceProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    // Find user's face profile
    const faceProfile = await UserFaceProfile.findOne({
      where: {
        userId,
        eventId,
        isActive: true,
      },
    });

    if (!faceProfile) {
      throw new NotFoundError("Face profile not found");
    }

    // Get person information to delete from Azure
    try {
      const persons = await AzureFaceService.listPersons(eventId);
      const person = persons.find((p) => p.userData === `User: ${userId}`);

      if (person) {
        await AzureFaceService.deletePerson(eventId, person.personId);
      }
    } catch (error) {
      console.error("Error deleting person from Azure:", error);
      // Continue with database deletion even if Azure deletion fails
    }

    // Soft delete the face profile
    await faceProfile.update({ isActive: false });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Face profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete face profile error:", error);
    next(error);
  }
};

// Get face detection statistics for an event
export const getFaceDetectionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check if user is event creator or admin
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isEventCreator = event.createdBy === userId;
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isEventCreator && !isAdmin) {
      throw new UnAuthorizedError(
        "You don't have permission to view face detection statistics"
      );
    }

    // Get face detection statistics
    const totalFaceDetections = await FaceDetection.count({
      where: {
        eventId,
        isActive: true,
      },
    });

    const identifiedFaces = await FaceDetection.count({
      where: {
        eventId,
        isActive: true,
        isIdentified: true,
      },
    });

    const unidentifiedFaces = totalFaceDetections - identifiedFaces;

    const totalFaceProfiles = await UserFaceProfile.count({
      where: {
        eventId,
        isActive: true,
      },
    });

    const mediaWithFaces = await FaceDetection.count({
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
      trainingStatus = await AzureFaceService.getPersonGroupTrainingStatus(
        eventId
      );
    } catch (error) {
      console.error("Error getting training status:", error);
    }

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get face detection stats error:", error);
    next(error);
  }
};

// Get all face profiles for an event (admin only)
export const getEventFaceProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check if user is event creator or admin
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isEventCreator = event.createdBy === userId;
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isEventCreator && !isAdmin) {
      throw new UnAuthorizedError(
        "You don't have permission to view face profiles"
      );
    }

    // Get face profiles with pagination
    const { count, rows: faceProfiles } = await UserFaceProfile.findAndCountAll(
      {
        where: {
          eventId,
          isActive: true,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "fullname", "email"],
          },
          {
            model: EventMedia,
            as: "enrollmentMedia",
            attributes: ["id", "mediaUrl", "fileName", "createdAt"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: limitNum,
        offset: offset,
      }
    );

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get event face profiles error:", error);
    next(error);
  }
};

// Get face detections for a specific media
export const getMediaFaceDetections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    // Find the media
    const media = await EventMedia.findByPk(mediaId, {
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "title", "createdBy"],
        },
      ],
    });

    if (!media) {
      throw new NotFoundError("Media not found");
    }

    // Check permissions
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isMediaUploader = media.uploadedBy === userId;
    const isEventCreator = (media as any).event.createdBy === userId;
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isMediaUploader && !isEventCreator && !isAdmin) {
      throw new UnAuthorizedError(
        "You don't have permission to view face detections for this media"
      );
    }

    // Get face detections for this media
    const faceDetections = await FaceDetection.findAll({
      where: {
        mediaId,
        isActive: true,
      },
      include: [
        {
          model: User,
          as: "identifiedUser",
          attributes: ["id", "fullname", "email"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get media face detections error:", error);
    next(error);
  }
};
