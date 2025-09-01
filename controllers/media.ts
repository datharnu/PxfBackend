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
// export const uploadEventMedia = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { eventId } = req.params;
//     const userId = req.user?.id;

//     if (!userId) {
//       throw new BadRequestError("User authentication required");
//     }

//     if (!req.files || req.files.length === 0) {
//       throw new BadRequestError("No files uploaded");
//     }

//     // Find the event
//     const event = await Event.findByPk(eventId);
//     if (!event) {
//       throw new NotFoundError("Event not found");
//     }

//     // Check if event is active
//     if (!event.isActive) {
//       throw new BadRequestError("Event is not active");
//     }

//     // Get user's existing uploads for this event
//     const userUploads = await EventMedia.count({
//       where: {
//         eventId,
//         uploadedBy: userId,
//         isActive: true,
//       },
//     });

//     // Check if user has reached their photo cap limit
//     const photoCapLimit = parseInt(event.photoCapLimit);
//     if (userUploads >= photoCapLimit) {
//       throw new BadRequestError(
//         `You have reached your upload limit of ${photoCapLimit} files for this event`
//       );
//     }

//     // Check if adding new files would exceed the limit
//     const filesToUpload = Array.isArray(req.files) ? req.files.length : 1;
//     if (userUploads + filesToUpload > photoCapLimit) {
//       throw new BadRequestError(
//         `Uploading ${filesToUpload} files would exceed your limit of ${photoCapLimit}. You have ${
//           photoCapLimit - userUploads
//         } uploads remaining.`
//       );
//     }

//     // Process uploaded files
//     const uploadedFiles = Array.isArray(req.files) ? req.files : [req.files];
//     const mediaRecords = [];

//     for (const file of uploadedFiles as Express.Multer.File[]) {
//       const mediaType = getMediaTypeFromMimeType(file.mimetype);
//       const mediaUrl = getFileUrl(eventId, file.filename);

//       const mediaRecord = await EventMedia.create({
//         eventId,
//         uploadedBy: userId,
//         mediaType,
//         mediaUrl,
//         fileName: file.originalname,
//         fileSize: file.size,
//         mimeType: file.mimetype,
//       });

//       mediaRecords.push(mediaRecord);
//     }

//     // Get updated upload count for response
//     const updatedUserUploads = await EventMedia.count({
//       where: {
//         eventId,
//         uploadedBy: userId,
//         isActive: true,
//       },
//     });

//     const remainingUploads = photoCapLimit - updatedUserUploads;

//     return res.status(StatusCodes.CREATED).json({
//       success: true,
//       message: "Media uploaded successfully",
//       uploadedMedia: mediaRecords,
//       uploadStats: {
//         totalUploads: updatedUserUploads,
//         remainingUploads,
//         photoCapLimit,
//       },
//     });
//   } catch (error) {
//     console.error("Upload media error:", error);
//     next(error);
//   }
// };

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

    // Parameters for Cloudinary upload
    const params = {
      timestamp: timestamp,
      folder: `events/${eventId}`,
      quality: "auto:best",
      fetch_format: "auto",
      flags: "progressive",
    };

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!
    );

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
      eventId,
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
          EventMedia.sequelize!.fn("COUNT", EventMedia.sequelize!.col("id")),
          "uploadCount",
        ],
        [
          EventMedia.sequelize!.fn(
            "SUM",
            EventMedia.sequelize!.col("fileSize")
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
          EventMedia.sequelize!.fn("COUNT", EventMedia.sequelize!.col("id")),
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
    console.error("Get event media by slug error:", error);
    next(error);
  }
};

// Middleware to handle file upload
export const uploadMiddleware = upload.array("media", 10);
