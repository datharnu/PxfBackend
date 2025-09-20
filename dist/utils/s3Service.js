"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
// Initialize S3 client
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
class S3Service {
    /**
     * Upload file to S3
     */
    static async uploadFile(file, key, contentType, metadata) {
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: file,
                ContentType: contentType,
                Metadata: metadata,
                // Enable CORS for web access
                ACL: "public-read", // or use bucket policy for better security
            });
            await s3Client.send(command);
            const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
            return {
                url,
                key,
            };
        }
        catch (error) {
            console.error("S3 upload error:", error);
            throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Generate presigned URL for direct upload from frontend
     */
    static async getPresignedUploadUrl(key, contentType, expiresIn = 3600 // 1 hour
    ) {
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: contentType,
                ACL: "public-read",
            });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
            const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
            return {
                uploadUrl,
                key,
                url,
            };
        }
        catch (error) {
            console.error("S3 presigned URL error:", error);
            throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Generate presigned URL for file download/viewing
     */
    static async getPresignedDownloadUrl(key, expiresIn = 3600 // 1 hour
    ) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
        }
        catch (error) {
            console.error("S3 presigned download URL error:", error);
            throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Delete file from S3
     */
    static async deleteFile(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            await s3Client.send(command);
        }
        catch (error) {
            console.error("S3 delete error:", error);
            throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Check if file exists in S3
     */
    static async fileExists(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            await s3Client.send(command);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get file metadata from S3
     */
    static async getFileMetadata(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            const response = await s3Client.send(command);
            return {
                size: response.ContentLength,
                lastModified: response.LastModified,
                contentType: response.ContentType,
                metadata: response.Metadata,
            };
        }
        catch (error) {
            console.error("S3 metadata error:", error);
            throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Generate unique key for file upload
     */
    static generateKey(eventId, userId, originalName, type = "image") {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
        return `events/${eventId}/${type}s/${userId}/${timestamp}-${randomId}.${extension}`;
    }
}
exports.S3Service = S3Service;
exports.default = S3Service;
