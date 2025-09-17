"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureFaceService = void 0;
const cognitiveservices_face_1 = require("@azure/cognitiveservices-face");
const ms_rest_js_1 = require("@azure/ms-rest-js");
const axios_1 = __importDefault(require("axios"));
// Azure Face API configuration
const AZURE_FACE_ENDPOINT = process.env.AZURE_FACE_ENDPOINT;
const AZURE_FACE_KEY = process.env.AZURE_FACE_KEY;
if (!AZURE_FACE_ENDPOINT || !AZURE_FACE_KEY) {
    throw new Error("Azure Face API credentials are not configured. Please set AZURE_FACE_ENDPOINT and AZURE_FACE_KEY environment variables.");
}
// Initialize Azure Face client
const credentials = new ms_rest_js_1.ApiKeyCredentials({
    inHeader: { "Ocp-Apim-Subscription-Key": AZURE_FACE_KEY },
});
const faceClient = new cognitiveservices_face_1.FaceClient(credentials, AZURE_FACE_ENDPOINT);
// Face detection options - detection only (no identification features)
const DETECTION_OPTIONS = {
    returnFaceId: false, // Don't request face ID to avoid identification features
};
// Face identification options
const IDENTIFICATION_OPTIONS = {
    maxNumOfCandidatesReturned: 10,
    confidenceThreshold: 0.5,
};
class AzureFaceService {
    /**
     * Test Azure Face API connection (detection only)
     */
    static async testConnection() {
        try {
            console.log("Testing Azure Face API connection...");
            console.log("Endpoint:", AZURE_FACE_ENDPOINT);
            console.log("Key present:", !!AZURE_FACE_KEY);
            // Test with a simple public image - detection only
            const testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Brad_Pitt_2019_by_Glenn_Francis.jpg/256px-Brad_Pitt_2019_by_Glenn_Francis.jpg";
            const result = await faceClient.face.detectWithUrl(testImageUrl, {
                returnFaceId: false, // Don't request face ID to avoid identification features
            });
            console.log("Azure Face API test successful:", result.length, "faces detected");
            return true;
        }
        catch (error) {
            console.error("Azure Face API test failed:", error);
            return false;
        }
    }
    /**
     * Detect faces in an image from URL
     */
    static async detectFacesFromUrl(imageUrl) {
        try {
            console.log("Azure Face API - Detecting faces from URL:", imageUrl);
            console.log("Azure Face API - Detection options:", DETECTION_OPTIONS);
            console.log("Azure Face API - Endpoint:", AZURE_FACE_ENDPOINT);
            const result = await faceClient.face.detectWithUrl(imageUrl, DETECTION_OPTIONS);
            return result.map((face, index) => ({
                faceId: `detected_${index}_${Date.now()}`, // Generate a temporary face ID
                faceRectangle: {
                    top: face.faceRectangle.top,
                    left: face.faceRectangle.left,
                    width: face.faceRectangle.width,
                    height: face.faceRectangle.height,
                },
                faceAttributes: face.faceAttributes
                    ? {
                        glasses: face.faceAttributes.glasses,
                        emotion: face.faceAttributes.emotion
                            ? {
                                anger: face.faceAttributes.emotion.anger || 0,
                                contempt: face.faceAttributes.emotion.contempt || 0,
                                disgust: face.faceAttributes.emotion.disgust || 0,
                                fear: face.faceAttributes.emotion.fear || 0,
                                happiness: face.faceAttributes.emotion.happiness || 0,
                                neutral: face.faceAttributes.emotion.neutral || 0,
                                sadness: face.faceAttributes.emotion.sadness || 0,
                                surprise: face.faceAttributes.emotion.surprise || 0,
                            }
                            : undefined,
                    }
                    : undefined,
                confidence: 1.0, // Azure doesn't provide confidence for detection, using 1.0
            }));
        }
        catch (error) {
            console.error("Error detecting faces from URL:", error);
            console.error("Error details:", {
                message: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
                imageUrl,
                detectionOptions: DETECTION_OPTIONS,
                endpoint: AZURE_FACE_ENDPOINT,
            });
            throw new Error(`Face detection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Detect faces in an image from buffer
     */
    static async detectFacesFromBuffer(imageBuffer) {
        try {
            const result = await faceClient.face.detectWithStream(imageBuffer, DETECTION_OPTIONS);
            return result.map((face) => ({
                faceId: face.faceId,
                faceRectangle: {
                    top: face.faceRectangle.top,
                    left: face.faceRectangle.left,
                    width: face.faceRectangle.width,
                    height: face.faceRectangle.height,
                },
                faceAttributes: face.faceAttributes
                    ? {
                        glasses: face.faceAttributes.glasses,
                        emotion: face.faceAttributes.emotion
                            ? {
                                anger: face.faceAttributes.emotion.anger || 0,
                                contempt: face.faceAttributes.emotion.contempt || 0,
                                disgust: face.faceAttributes.emotion.disgust || 0,
                                fear: face.faceAttributes.emotion.fear || 0,
                                happiness: face.faceAttributes.emotion.happiness || 0,
                                neutral: face.faceAttributes.emotion.neutral || 0,
                                sadness: face.faceAttributes.emotion.sadness || 0,
                                surprise: face.faceAttributes.emotion.surprise || 0,
                            }
                            : undefined,
                    }
                    : undefined,
                confidence: 1.0,
            }));
        }
        catch (error) {
            console.error("Error detecting faces from buffer:", error);
            throw new Error(`Face detection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Create a person group for an event
     */
    static async createPersonGroup(eventId, eventName) {
        try {
            await faceClient.personGroup.create(eventId, `Event: ${eventName}`, {
                userData: `Event group for ${eventId}`,
            });
        }
        catch (error) {
            console.error("Error creating person group:", error);
            throw new Error(`Failed to create person group: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Delete a person group
     */
    static async deletePersonGroup(eventId) {
        try {
            await faceClient.personGroup.deleteMethod(eventId);
        }
        catch (error) {
            console.error("Error deleting person group:", error);
            throw new Error(`Failed to delete person group: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Create a person in a person group
     */
    static async createPerson(eventId, userId, userName) {
        try {
            const result = await faceClient.personGroupPerson.create(eventId, {
                name: userName,
                userData: `User: ${userId}`,
            });
            return result.personId;
        }
        catch (error) {
            console.error("Error creating person:", error);
            throw new Error(`Failed to create person: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Add a face to a person
     */
    static async addFaceToPerson(eventId, personId, imageUrl) {
        try {
            const result = await faceClient.personGroupPerson.addFaceFromUrl(eventId, personId, imageUrl);
            return result.persistedFaceId;
        }
        catch (error) {
            console.error("Error adding face to person:", error);
            throw new Error(`Failed to add face to person: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Add a face to a person from buffer
     */
    static async addFaceToPersonFromBuffer(eventId, personId, imageBuffer) {
        try {
            const result = await faceClient.personGroupPerson.addFaceFromStream(eventId, personId, imageBuffer);
            return result.persistedFaceId;
        }
        catch (error) {
            console.error("Error adding face to person from buffer:", error);
            throw new Error(`Failed to add face to person: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Train a person group
     */
    static async trainPersonGroup(eventId) {
        try {
            await faceClient.personGroup.train(eventId);
        }
        catch (error) {
            console.error("Error training person group:", error);
            throw new Error(`Failed to train person group: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Get training status of a person group
     */
    static async getPersonGroupTrainingStatus(eventId) {
        try {
            const result = await faceClient.personGroup.getTrainingStatus(eventId);
            return result.status;
        }
        catch (error) {
            console.error("Error getting training status:", error);
            throw new Error(`Failed to get training status: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Identify faces in an image
     */
    static async identifyFaces(eventId, faceIds) {
        try {
            const result = await faceClient.face.identify(faceIds, {
                personGroupId: eventId,
                ...IDENTIFICATION_OPTIONS,
            });
            return result.map((face) => ({
                faceId: face.faceId,
                candidates: face.candidates?.map((candidate) => ({
                    personId: candidate.personId,
                    confidence: candidate.confidence,
                })) || [],
            }));
        }
        catch (error) {
            console.error("Error identifying faces:", error);
            throw new Error(`Face identification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Delete a person from a person group
     */
    static async deletePerson(eventId, personId) {
        try {
            await faceClient.personGroupPerson.deleteMethod(eventId, personId);
        }
        catch (error) {
            console.error("Error deleting person:", error);
            throw new Error(`Failed to delete person: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Delete a face from a person
     */
    static async deleteFace(eventId, personId, persistedFaceId) {
        try {
            await faceClient.personGroupPerson.deleteFace(eventId, personId, persistedFaceId);
        }
        catch (error) {
            console.error("Error deleting face:", error);
            throw new Error(`Failed to delete face: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Get person information
     */
    static async getPerson(eventId, personId) {
        try {
            const result = await faceClient.personGroupPerson.get(eventId, personId);
            return result;
        }
        catch (error) {
            console.error("Error getting person:", error);
            throw new Error(`Failed to get person: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * List all persons in a person group
     */
    static async listPersons(eventId) {
        try {
            const result = await faceClient.personGroupPerson.list(eventId);
            return result;
        }
        catch (error) {
            console.error("Error listing persons:", error);
            throw new Error(`Failed to list persons: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Download image from URL and return as buffer
     */
    static async downloadImageAsBuffer(imageUrl) {
        try {
            const response = await axios_1.default.get(imageUrl, {
                responseType: "arraybuffer",
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
exports.AzureFaceService = AzureFaceService;
exports.default = AzureFaceService;
