import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import { v2 as cloudinary } from "cloudinary";
import Event, { PhotoCapLimit } from "../models/event";
import EventMedia, { MediaType } from "../models/eventMedia";
import User from "../models/user";
import BadRequestError from "../errors/badRequest";
import NotFoundError from "../errors/notFound";
import UnAuthorizedError from "../errors/unauthorized";
import upload, {
  getMediaTypeFromMimeType,
  getFileUrl,
} from "../utils/fileUpload";
import FaceProcessingService from "../utils/faceProcessingService";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Interface for media URL submission
interface MediaUrlData {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  publicId: string;
}

// Upload media to event

// FAST METHOD: Submit Cloudinary URLs (Frontend uploads directly to Cloudinary)
export const submitCloudinaryMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const { mediaUrls }: { mediaUrls: MediaUrlData[] } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      throw new BadRequestError("No media URLs provided");
    }

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    if (!event.isActive) {
      throw new BadRequestError("Event is not active");
    }

    // Get user's existing uploads
    const userUploads = await EventMedia.count({
      where: {
        eventId,
        uploadedBy: userId,
        isActive: true,
      },
    });

    const photoCapLimit = parseInt(event.photoCapLimit as string);

    // Check limits
    if (userUploads >= photoCapLimit) {
      throw new BadRequestError(
        `You have reached your upload limit of ${photoCapLimit} files for this event`
      );
    }

    if (userUploads + mediaUrls.length > photoCapLimit) {
      throw new BadRequestError(
        `Submitting ${
          mediaUrls.length
        } files would exceed your limit of ${photoCapLimit}. You have ${
          photoCapLimit - userUploads
        } uploads remaining.`
      );
    }

    // Validate Cloudinary URLs belong to your cloud (security check)
    const validCloudinaryDomain = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;

    // Create database records
    const mediaRecords = [];
    for (const mediaData of mediaUrls) {
      // Security: Verify URL is from your Cloudinary account
      if (!mediaData.url.startsWith(validCloudinaryDomain)) {
        throw new BadRequestError(`Invalid media URL: ${mediaData.fileName}`);
      }

      const mediaType = mediaData.mimeType.startsWith("video/")
        ? MediaType.VIDEO
        : MediaType.IMAGE;

      const mediaRecord = await EventMedia.create({
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
      .filter((media) => media.mediaType === MediaType.IMAGE)
      .map((media) => media.id);

    if (imageMediaIds.length > 0) {
      // Process faces asynchronously
      FaceProcessingService.processMultipleMediaForFaces(imageMediaIds)
        .then((results) => {
          console.log(
            `Face processing completed for ${imageMediaIds.length} images:`,
            results
          );
        })
        .catch((error) => {
          console.error("Face processing failed:", error);
        });
    }

    // Get updated stats
    const updatedUserUploads = await EventMedia.count({
      where: {
        eventId,
        uploadedBy: userId,
        isActive: true,
      },
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Media uploaded successfully",
      uploadedMedia: mediaRecords,
      uploadStats: {
        totalUploads: updatedUserUploads,
        remainingUploads: photoCapLimit - updatedUserUploads,
        photoCapLimit,
      },
      faceProcessing: {
        imagesProcessed: imageMediaIds.length,
        status: "processing",
      },
    });
  } catch (error) {
    console.error("Submit Cloudinary media error:", error);
    next(error);
  }
};

// Generate Cloudinary signature for secure frontend uploads

export const getCloudinarySignature = async (
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

    if (!event.isActive) {
      throw new BadRequestError("Event is not active");
    }

    // Check user's current upload count
    const userUploads = await EventMedia.count({
      where: {
        eventId,
        uploadedBy: userId,
        isActive: true,
      },
    });

    const photoCapLimit = parseInt(event.photoCapLimit as string);
    if (userUploads >= photoCapLimit) {
      throw new BadRequestError(
        `You have reached your upload limit of ${photoCapLimit} files for this event`
      );
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
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!
    );

    // console.log("Generated signature:", signature);

    return res.status(StatusCodes.OK).json({
      success: true,
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: `events/${eventId}`,
      remainingUploads: photoCapLimit - userUploads,
    });
  } catch (error) {
    console.error("Get Cloudinary signature error:", error);
    next(error);
  }
};
// Get all media for an event
export const getEventMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20, mediaType, uploadedBy } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Build where clause
    const whereClause: any = {
      eventId: event.id,
      isActive: true,
    };

    if (
      mediaType &&
      Object.values(MediaType).includes(mediaType as MediaType)
    ) {
      whereClause.mediaType = mediaType;
    }

    if (uploadedBy) {
      whereClause.uploadedBy = uploadedBy;
    }

    const { count, rows: media } = await EventMedia.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "fullname", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset: offset,
    });

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get event media error:", error);
    next(error);
  }
};

// Get user's uploads for an event
export const getUserEventUploads = async (
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

    // Get user's uploads
    const userUploads = await EventMedia.findAll({
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
    }, {} as Record<string, any[]>);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User uploads retrieved successfully",
      uploads: userUploads,
      uploadsByType,
      stats: {
        totalUploads,
        remainingUploads,
        photoCapLimit,
        imagesCount: uploadsByType[MediaType.IMAGE]?.length || 0,
        videosCount: uploadsByType[MediaType.VIDEO]?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get user uploads error:", error);
    next(error);
  }
};

// Get upload statistics for an event
export const getEventUploadStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Get total uploads for the event
    const totalUploads = await EventMedia.count({
      where: {
        eventId,
        isActive: true,
      },
    });

    // Get uploads by type
    const uploadsByType = await EventMedia.findAll({
      where: {
        eventId,
        isActive: true,
      },
      attributes: [
        "mediaType",
        [
          EventMedia.sequelize!.fn("COUNT", EventMedia.sequelize!.col("id")),
          "count",
        ],
      ],
      group: ["mediaType"],
      raw: true,
    });

    // Get unique participants (uploaders) count
    const uniqueParticipants = await EventMedia.count({
      where: {
        eventId,
        isActive: true,
      },
      distinct: true,
      col: "uploadedBy",
    });

    // Get participant details with their upload counts
    const participants = await EventMedia.findAll({
      where: {
        eventId,
        isActive: true,
      },
      attributes: [
        "uploadedBy",
        [
          EventMedia.sequelize!.fn(
            "COUNT",
            EventMedia.sequelize!.col("EventMedia.id")
          ),
          "uploadCount",
        ],
        [
          EventMedia.sequelize!.fn(
            "SUM",
            EventMedia.sequelize!.col("EventMedia.fileSize")
          ),
          "totalFileSize",
        ],
      ],
      include: [
        {
          model: User,
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
          EventMedia.sequelize!.fn(
            "COUNT",
            EventMedia.sequelize!.col("EventMedia.id")
          ),
          "DESC",
        ],
      ],
      raw: true,
      nest: true,
    });

    // Get recent uploads (last 10)
    const recentUploads = await EventMedia.findAll({
      where: {
        eventId,
        isActive: true,
      },
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "fullname"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    // Calculate total file size
    const totalFileSize = await EventMedia.sum("fileSize", {
      where: {
        eventId,
        isActive: true,
      },
    });

    // Calculate photos and videos count
    const photosCount =
      (uploadsByType as any[]).find(
        (item) => item.mediaType === MediaType.IMAGE
      )?.count || "0";
    const videosCount =
      (uploadsByType as any[]).find(
        (item) => item.mediaType === MediaType.VIDEO
      )?.count || "0";

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Event upload statistics retrieved successfully",
      stats: {
        totalUploads,
        uniqueParticipants,
        totalFileSize: totalFileSize || 0,
        photosCount: parseInt(photosCount),
        videosCount: parseInt(videosCount),
        uploadsByType: uploadsByType.reduce((acc, item: any) => {
          acc[item.mediaType] = parseInt(item.count);
          return acc;
        }, {} as Record<string, number>),
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
  } catch (error) {
    console.error("Get upload stats error:", error);
    next(error);
  }
};

// List all participants for an event with their uploads
export const getEventParticipantsWithUploads = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Ensure event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Find distinct uploaders for the event with counts
    const participants = await EventMedia.findAll({
      where: { eventId, isActive: true },
      attributes: [
        "uploadedBy",
        [
          EventMedia.sequelize!.fn(
            "COUNT",
            EventMedia.sequelize!.col("EventMedia.id")
          ),
          "uploadCount",
        ],
      ],
      include: [
        {
          model: User,
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
          EventMedia.sequelize!.fn(
            "COUNT",
            EventMedia.sequelize!.col("EventMedia.id")
          ),
          "DESC",
        ],
      ],
      offset,
      limit: limitNum,
      raw: true,
      nest: true,
    });

    // Total unique participants for pagination
    const totalParticipants = await EventMedia.count({
      where: { eventId, isActive: true },
      distinct: true,
      col: "uploadedBy",
    });

    // For each participant, fetch a few recent uploads (thumbnails)
    const participantIds = participants.map((p: any) => p.uploadedBy);
    const recentUploads = await EventMedia.findAll({
      where: {
        eventId,
        isActive: true,
        uploadedBy: participantIds.length ? participantIds : undefined,
      },
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum * 3, // up to three per participant on average
    });

    const uploadsByUser: Record<string, any[]> = {};
    for (const media of recentUploads) {
      const key = (media as any).uploadedBy as string;
      if (!uploadsByUser[key]) uploadsByUser[key] = [];
      if (uploadsByUser[key].length < 3) {
        uploadsByUser[key].push({
          id: media.id,
          mediaType: media.mediaType,
          mediaUrl: media.mediaUrl,
          createdAt: media.createdAt,
        });
      }
    }

    const data = participants.map((p: any) => ({
      user: p.uploader,
      uploadedBy: p.uploadedBy,
      uploadCount: Number(p.uploadCount || 0),
      recentUploads: uploadsByUser[p.uploadedBy] || [],
    }));

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get event participants error:", error);
    next(error);
  }
};

// Get all uploads for a specific user in an event
export const getEventUserUploads = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, userId } = req.params;
    const { page = 1, limit = 20, mediaType } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Ensure event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Ensure user exists
    const uploader = await User.findByPk(userId);
    if (!uploader) {
      throw new NotFoundError("User not found");
    }

    const whereClause: any = { eventId, uploadedBy: userId, isActive: true };
    if (
      mediaType &&
      Object.values(MediaType).includes(mediaType as MediaType)
    ) {
      whereClause.mediaType = mediaType;
    }

    const { count, rows } = await EventMedia.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User uploads retrieved successfully",
      uploads: rows,
      user: {
        id: uploader.id,
        fullname: (uploader as any).fullname,
        email: (uploader as any).email,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
      eventInfo: { id: event.id, title: event.title },
    });
  } catch (error) {
    console.error("Get event user uploads error:", error);
    next(error);
  }
};

// Delete user's media upload
export const deleteUserMedia = async (
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

    // Find the media record
    const media = await EventMedia.findByPk(mediaId);

    if (!media) {
      throw new NotFoundError("Media not found");
    }

    // Check if user owns the media
    if (media.uploadedBy !== userId) {
      // If not the uploader, check if they're the event creator
      const event = await Event.findByPk(media.eventId);
      if (!event || event.createdBy !== userId) {
        throw new UnAuthorizedError("You can only delete your own uploads");
      }
    }

    // Soft delete the media
    await media.update({ isActive: false });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Delete media error:", error);
    next(error);
  }
};

// Get media by slug (for public access)
export const getEventMediaBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, mediaType } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Find the event by slug
    const event = await Event.findOne({
      where: { eventSlug: slug, isActive: true },
    });

    if (!event) {
      throw new NotFoundError("Event not found or inactive");
    }

    // Build where clause
    const whereClause: any = {
      eventId: event.id,
      isActive: true,
    };

    if (
      mediaType &&
      Object.values(MediaType).includes(mediaType as MediaType)
    ) {
      whereClause.mediaType = mediaType;
    }

    // Get paginated media with uploader info
    const { count, rows: media } = await EventMedia.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "fullname"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset: offset,
    });

    // Get total unique participants count
    const uniqueParticipants = await EventMedia.count({
      where: {
        eventId: event.id,
        isActive: true,
      },
      distinct: true,
      col: "uploadedBy",
    });

    // Get media type breakdown
    const mediaTypeBreakdown = await EventMedia.findAll({
      where: {
        eventId: event.id,
        isActive: true,
      },
      attributes: [
        "mediaType",
        [
          EventMedia.sequelize!.fn("COUNT", EventMedia.sequelize!.col("id")),
          "count",
        ],
      ],
      group: ["mediaType"],
      raw: true,
    });

    // Process statistics
    const totalParticipants = uniqueParticipants || 0;

    const mediaStats = (mediaTypeBreakdown as any[]).reduce(
      (acc: any, item: any) => {
        acc[item.mediaType] = parseInt(item.count);
        return acc;
      },
      {}
    );

    const totalPhotos = mediaStats[MediaType.IMAGE] || 0;
    const totalVideos = mediaStats[MediaType.VIDEO] || 0;
    const totalMedia = totalPhotos + totalVideos;

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get event media by slug error:", error);
    next(error);
  }
};

// Get media filtered by user's face detection
export const getMediaWithUserFaces = async (
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

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Get media with user's faces
    const mediaWithFaces = await FaceProcessingService.getMediaWithUserFaces(
      eventId,
      userId
    );

    // Apply pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedMedia = mediaWithFaces.slice(startIndex, endIndex);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Media with your face retrieved successfully",
      media: paginatedMedia,
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
  } catch (error) {
    console.error("Get media with user faces error:", error);
    next(error);
  }
};

// Get all face detections for an event (admin/event creator only)
export const getEventFaceDetections = async (
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

    // Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check permissions
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isEventCreator = event.createdBy === userId;
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isEventCreator && !isAdmin) {
      throw new UnAuthorizedError(
        "You don't have permission to view face detections"
      );
    }

    // Get face detections
    const result = await FaceProcessingService.getEventFaceDetections(
      eventId,
      pageNum,
      limitNum
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Face detections retrieved successfully",
      ...result,
      eventInfo: {
        id: event.id,
        title: event.title,
      },
    });
  } catch (error) {
    console.error("Get event face detections error:", error);
    next(error);
  }
};

// Get face detection statistics for an event (admin/event creator only)
export const getEventFaceStats = async (
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

    // Check permissions
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isEventCreator = event.createdBy === userId;
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isEventCreator && !isAdmin) {
      throw new UnAuthorizedError(
        "You don't have permission to view face statistics"
      );
    }

    // Get face statistics
    const stats = await FaceProcessingService.getEventFaceStats(eventId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Face detection statistics retrieved successfully",
      stats,
      eventInfo: {
        id: event.id,
        title: event.title,
      },
    });
  } catch (error) {
    console.error("Get event face stats error:", error);
    next(error);
  }
};

// Retrain face identification for an event (admin/event creator only)
export const retrainFaceIdentification = async (
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

    // Check permissions
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isEventCreator = event.createdBy === userId;
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isEventCreator && !isAdmin) {
      throw new UnAuthorizedError(
        "You don't have permission to retrain face identification"
      );
    }

    // Retrain face identification
    const success = await FaceProcessingService.retrainEventFaceIdentification(
      eventId
    );

    return res.status(StatusCodes.OK).json({
      success,
      message: success
        ? "Face identification retraining started successfully"
        : "Failed to start face identification retraining",
      eventInfo: {
        id: event.id,
        title: event.title,
      },
    });
  } catch (error) {
    console.error("Retrain face identification error:", error);
    next(error);
  }
};

// Middleware to handle file upload
export const uploadMiddleware = upload.array("media", 10);
