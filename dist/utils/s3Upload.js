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
exports.deleteFile = exports.getFileUrl = exports.getMediaTypeFromMimeType = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const client_s3_1 = require("@aws-sdk/client-s3");
// Initialize S3 client
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
// File filter function
const fileFilter = (req, file, cb) => {
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
    }
    else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`));
    }
};
// Configure multer with S3 storage
const upload = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: s3Client,
        bucket: BUCKET_NAME,
        acl: "public-read",
        key: function (req, file, cb) {
            // Generate unique key for the file
            const eventId = req.params.eventId || req.body.eventId;
            const userId = req.user?.id || "anonymous";
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 15);
            const extension = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
            // Determine if it's an image or video
            const isVideo = file.mimetype.startsWith("video/");
            const type = isVideo ? "videos" : "images";
            const key = `events/${eventId}/${type}/${userId}/${timestamp}-${randomId}.${extension}`;
            cb(null, key);
        },
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
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
const getMediaTypeFromMimeType = (mimeType) => {
    const imageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    ];
    return imageTypes.includes(mimeType) ? "image" : "video";
};
exports.getMediaTypeFromMimeType = getMediaTypeFromMimeType;
// Helper function to get file URL from S3 key
const getFileUrl = (key) => {
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
};
exports.getFileUrl = getFileUrl;
// Helper function to delete file from S3
const deleteFile = async (key) => {
    try {
        const { DeleteObjectCommand } = await Promise.resolve().then(() => __importStar(require("@aws-sdk/client-s3")));
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        await s3Client.send(command);
    }
    catch (error) {
        console.error("Error deleting file from S3:", error);
        throw error;
    }
};
exports.deleteFile = deleteFile;
exports.default = upload;
