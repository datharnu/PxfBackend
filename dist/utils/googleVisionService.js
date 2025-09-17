"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleVisionService = void 0;
const vision_1 = require("@google-cloud/vision");
const axios_1 = __importDefault(require("axios"));
// Google Cloud Vision API configuration
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
if (!GOOGLE_VISION_API_KEY) {
    throw new Error("Google Vision API key is not configured. Please set GOOGLE_VISION_API_KEY environment variable.");
}
// Initialize Google Vision client
const visionClient = new vision_1.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Optional: for service account
    apiKey: GOOGLE_VISION_API_KEY,
});
class GoogleVisionService {
    /**
     * Test Google Vision API connection
     */
    static async testConnection() {
        try {
            console.log("Testing Google Vision API connection...");
            console.log("API Key present:", !!GOOGLE_VISION_API_KEY);
            // Test with a simple public image
            const testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Brad_Pitt_2019_by_Glenn_Francis.jpg/256px-Brad_Pitt_2019_by_Glenn_Francis.jpg";
            const result = await this.detectFacesFromUrl(testImageUrl);
            console.log("Google Vision API test successful:", result.length, "faces detected");
            return true;
        }
        catch (error) {
            console.error("Google Vision API test failed:", error);
            return false;
        }
    }
    /**
     * Detect faces in an image from URL
     */
    static async detectFacesFromUrl(imageUrl) {
        try {
            console.log("Google Vision API - Detecting faces from URL:", imageUrl);
            const [result] = await visionClient.faceDetection({
                image: {
                    source: {
                        imageUri: imageUrl,
                    },
                },
                imageContext: {
                    languageHints: ['en'],
                },
            });
            const faces = result.faceAnnotations || [];
            console.log(`Google Vision detected ${faces.length} faces`);
            return faces.map((face, index) => ({
                faceId: `google_face_${index}_${Date.now()}`,
                faceRectangle: {
                    top: face.boundingPoly?.vertices?.[0]?.y || 0,
                    left: face.boundingPoly?.vertices?.[0]?.x || 0,
                    width: (face.boundingPoly?.vertices?.[1]?.x || 0) - (face.boundingPoly?.vertices?.[0]?.x || 0),
                    height: (face.boundingPoly?.vertices?.[2]?.y || 0) - (face.boundingPoly?.vertices?.[0]?.y || 0),
                },
                faceAttributes: {
                    glasses: 'NoGlasses', // Google Vision doesn't provide glasses detection in landmarks
                    emotion: face.landmarks ? {
                        anger: 0,
                        contempt: 0,
                        disgust: 0,
                        fear: 0,
                        happiness: face.joyLikelihood === 'VERY_LIKELY' ? 0.9 :
                            face.joyLikelihood === 'LIKELY' ? 0.7 :
                                face.joyLikelihood === 'POSSIBLE' ? 0.5 : 0,
                        neutral: face.sorrowLikelihood === 'VERY_LIKELY' ? 0.9 :
                            face.sorrowLikelihood === 'LIKELY' ? 0.7 :
                                face.sorrowLikelihood === 'POSSIBLE' ? 0.5 : 0,
                        sadness: face.sorrowLikelihood === 'VERY_LIKELY' ? 0.9 :
                            face.sorrowLikelihood === 'LIKELY' ? 0.7 :
                                face.sorrowLikelihood === 'POSSIBLE' ? 0.5 : 0,
                        surprise: 0,
                    } : undefined,
                },
                confidence: face.detectionConfidence || 1.0,
                landmarks: face.landmarks || [],
            }));
        }
        catch (error) {
            console.error("Error detecting faces from URL:", error);
            console.error("Error details:", {
                message: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
                imageUrl,
                apiKey: !!GOOGLE_VISION_API_KEY,
            });
            throw new Error(`Face detection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Detect faces in an image from buffer
     */
    static async detectFacesFromBuffer(imageBuffer) {
        try {
            console.log("Google Vision API - Detecting faces from buffer");
            const [result] = await visionClient.faceDetection({
                image: {
                    content: imageBuffer,
                },
                imageContext: {
                    languageHints: ['en'],
                },
            });
            const faces = result.faceAnnotations || [];
            console.log(`Google Vision detected ${faces.length} faces`);
            return faces.map((face, index) => ({
                faceId: `google_face_${index}_${Date.now()}`,
                faceRectangle: {
                    top: face.boundingPoly?.vertices?.[0]?.y || 0,
                    left: face.boundingPoly?.vertices?.[0]?.x || 0,
                    width: (face.boundingPoly?.vertices?.[1]?.x || 0) - (face.boundingPoly?.vertices?.[0]?.x || 0),
                    height: (face.boundingPoly?.vertices?.[2]?.y || 0) - (face.boundingPoly?.vertices?.[0]?.y || 0),
                },
                faceAttributes: {
                    glasses: 'NoGlasses', // Google Vision doesn't provide glasses detection in landmarks
                    emotion: face.landmarks ? {
                        anger: 0,
                        contempt: 0,
                        disgust: 0,
                        fear: 0,
                        happiness: face.joyLikelihood === 'VERY_LIKELY' ? 0.9 :
                            face.joyLikelihood === 'LIKELY' ? 0.7 :
                                face.joyLikelihood === 'POSSIBLE' ? 0.5 : 0,
                        neutral: face.sorrowLikelihood === 'VERY_LIKELY' ? 0.9 :
                            face.sorrowLikelihood === 'LIKELY' ? 0.7 :
                                face.sorrowLikelihood === 'POSSIBLE' ? 0.5 : 0,
                        sadness: face.sorrowLikelihood === 'VERY_LIKELY' ? 0.9 :
                            face.sorrowLikelihood === 'LIKELY' ? 0.7 :
                                face.sorrowLikelihood === 'POSSIBLE' ? 0.5 : 0,
                        surprise: 0,
                    } : undefined,
                },
                confidence: face.detectionConfidence || 1.0,
                landmarks: face.landmarks || [],
            }));
        }
        catch (error) {
            console.error("Error detecting faces from buffer:", error);
            throw new Error(`Face detection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Compare two faces for similarity
     */
    static async compareFaces(imageUrl1, imageUrl2) {
        try {
            console.log("Google Vision API - Comparing faces");
            const [result] = await visionClient.faceDetection({
                image: {
                    source: {
                        imageUri: imageUrl1,
                    },
                },
            });
            const faces1 = result.faceAnnotations || [];
            const [result2] = await visionClient.faceDetection({
                image: {
                    source: {
                        imageUri: imageUrl2,
                    },
                },
            });
            const faces2 = result2.faceAnnotations || [];
            // For now, return a simple comparison based on face landmarks
            // In a real implementation, you'd use Google's face comparison features
            const similarities = [];
            faces1.forEach((face1, index1) => {
                faces2.forEach((face2, index2) => {
                    const similarity = this.calculateFaceSimilarity(face1, face2);
                    similarities.push({
                        face1: `face_${index1}`,
                        face2: `face_${index2}`,
                        similarity,
                    });
                });
            });
            return similarities;
        }
        catch (error) {
            console.error("Error comparing faces:", error);
            throw new Error(`Face comparison failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Calculate face similarity based on landmarks
     */
    static calculateFaceSimilarity(face1, face2) {
        if (!face1.landmarks || !face2.landmarks)
            return 0;
        // Simple similarity based on landmark positions
        const landmarks1 = face1.landmarks;
        const landmarks2 = face2.landmarks;
        let totalSimilarity = 0;
        let landmarkCount = 0;
        landmarks1.forEach((landmark1) => {
            const landmark2 = landmarks2.find((l) => l.type === landmark1.type);
            if (landmark2) {
                const distance = Math.sqrt(Math.pow(landmark1.position.x - landmark2.position.x, 2) +
                    Math.pow(landmark1.position.y - landmark2.position.y, 2));
                const similarity = Math.max(0, 1 - distance / 100); // Normalize distance
                totalSimilarity += similarity;
                landmarkCount++;
            }
        });
        return landmarkCount > 0 ? totalSimilarity / landmarkCount : 0;
    }
    /**
     * Download image from URL
     */
    static async downloadImage(imageUrl) {
        try {
            const response = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 seconds timeout
                maxContentLength: 10 * 1024 * 1024, // 10MB max
            });
            return Buffer.from(response.data);
        }
        catch (error) {
            console.error("Error downloading image:", error);
            throw new Error(`Failed to download image: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Validate if an image URL is accessible
     */
    static async validateImageUrl(imageUrl) {
        try {
            const response = await axios_1.default.head(imageUrl, {
                timeout: 10000, // 10 seconds timeout
            });
            return response.status === 200;
        }
        catch (error) {
            console.error("Error validating image URL:", error);
            return false;
        }
    }
}
exports.GoogleVisionService = GoogleVisionService;
exports.default = GoogleVisionService;
