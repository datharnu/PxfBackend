"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileSize = exports.deleteFile = exports.getFileUrl = exports.getMediaTypeFromMimeType = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const eventMedia_1 = require("../models/eventMedia");
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(__dirname, "../uploads");
const eventMediaDir = path_1.default.join(uploadsDir, "event-media");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs_1.default.existsSync(eventMediaDir)) {
    fs_1.default.mkdirSync(eventMediaDir, { recursive: true });
}
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Create event-specific directory
        const eventId = req.params.eventId || req.body.eventId;
        const eventDir = path_1.default.join(eventMediaDir, eventId);
        if (!fs_1.default.existsSync(eventDir)) {
            fs_1.default.mkdirSync(eventDir, { recursive: true });
        }
        cb(null, eventDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
});
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
// Configure multer
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
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
    return imageTypes.includes(mimeType) ? eventMedia_1.MediaType.IMAGE : eventMedia_1.MediaType.VIDEO;
};
exports.getMediaTypeFromMimeType = getMediaTypeFromMimeType;
// Helper function to get file URL
const getFileUrl = (eventId, filename) => {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    return `${baseUrl}/uploads/event-media/${eventId}/${filename}`;
};
exports.getFileUrl = getFileUrl;
// Helper function to delete file
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs_1.default.unlink(filePath, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
};
exports.deleteFile = deleteFile;
// Helper function to get file size
const getFileSize = (filePath) => {
    return new Promise((resolve, reject) => {
        fs_1.default.stat(filePath, (err, stats) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(stats.size);
            }
        });
    });
};
exports.getFileSize = getFileSize;
exports.default = upload;
