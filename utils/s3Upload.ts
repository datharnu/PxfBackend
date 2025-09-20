import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { Request } from "express";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check file type
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const allowedVideoTypes = [
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/webm",
  ];

  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`)
    );
  }
};

// Configure multer with S3 storage
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    // acl removed - using bucket policy for public access instead
    key: function (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, key?: string) => void
    ) {
      // Generate unique key for the file
      const eventId = req.params.eventId || req.body.eventId;
      const userId = req.user?.id || "anonymous";
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension =
        file.originalname.split(".").pop()?.toLowerCase() || "jpg";

      // Determine if it's an image or video
      const isVideo = file.mimetype.startsWith("video/");
      const type = isVideo ? "videos" : "images";

      const key = `events/${eventId}/${type}/${userId}/${timestamp}-${randomId}.${extension}`;
      cb(null, key);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, metadata?: any) => void
    ) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedBy: req.user?.id || "anonymous",
        eventId: req.params.eventId || req.body.eventId,
      });
    },
  }),
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max (to accommodate videos)
    files: 10, // Max 10 files per request
  },
});

// Helper function to get media type from mime type
export const getMediaTypeFromMimeType = (
  mimeType: string
): "image" | "video" => {
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return imageTypes.includes(mimeType) ? "image" : "video";
};

// Helper function to get file URL from S3 key
export const getFileUrl = (key: string): string => {
  const region = process.env.AWS_REGION || "us-east-1";
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
};

// Helper function to delete file from S3
export const deleteFile = async (key: string): Promise<void> => {
  try {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
};

export default upload;
