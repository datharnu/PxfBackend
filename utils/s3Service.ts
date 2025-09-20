import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export class S3Service {
  /**
   * Upload file to S3
   */
  static async uploadFile(
    file: Buffer | Uint8Array | string,
    key: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; key: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
        // ACL removed - using bucket policy for public access instead
      });

      await s3Client.send(command);

      const url = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${key}`;

      return {
        url,
        key,
      };
    } catch (error) {
      console.error("S3 upload error:", error);
      throw new Error(
        `Failed to upload file to S3: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Upload face enrollment file to S3 with public read access
   */
  static async uploadFaceEnrollmentFile(
    file: Buffer | Uint8Array | string,
    key: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; key: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
        // Ensure face enrollment files are publicly readable
        CacheControl: "public, max-age=31536000", // Cache for 1 year
      });

      await s3Client.send(command);

      const url = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${key}`;

      return {
        url,
        key,
      };
    } catch (error) {
      console.error("S3 face enrollment upload error:", error);
      throw new Error(
        `Failed to upload face enrollment file to S3: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate presigned URL for direct upload from frontend
   */
  static async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<{ uploadUrl: string; key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        // ACL removed - using bucket policy for public access instead
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
      const url = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${key}`;

      return {
        uploadUrl,
        key,
        url,
      };
    } catch (error) {
      console.error("S3 presigned URL error:", error);
      throw new Error(
        `Failed to generate presigned URL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate presigned URL for face enrollment upload with public access
   */
  static async getFaceEnrollmentPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<{ uploadUrl: string; key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000", // Cache for 1 year
        // Ensure face enrollment files are publicly accessible
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
      const url = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${key}`;

      return {
        uploadUrl,
        key,
        url,
      };
    } catch (error) {
      console.error("S3 face enrollment presigned URL error:", error);
      throw new Error(
        `Failed to generate face enrollment presigned URL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate presigned URL for file download/viewing
   */
  static async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error("S3 presigned download URL error:", error);
      throw new Error(
        `Failed to generate download URL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error("S3 delete error:", error);
      throw new Error(
        `Failed to delete file from S3: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if file exists in S3
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  static async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
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
    } catch (error) {
      console.error("S3 metadata error:", error);
      throw new Error(
        `Failed to get file metadata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate unique key for file upload
   */
  static generateKey(
    eventId: string,
    userId: string,
    originalName: string,
    type: "image" | "video" = "image"
  ): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";

    return `events/${eventId}/${type}s/${userId}/${timestamp}-${randomId}.${extension}`;
  }
}

export default S3Service;
