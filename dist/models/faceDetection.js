"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
// Define the FaceDetection model class
class FaceDetection extends sequelize_1.Model {
    // Method to get face rectangle as a formatted string
    getFaceRectangleString() {
        return `${this.faceRectangle.left},${this.faceRectangle.top},${this.faceRectangle.width},${this.faceRectangle.height}`;
    }
    // Method to check if face has high confidence
    isHighConfidence(threshold = 0.7) {
        return this.confidence >= threshold;
    }
    // Method to get primary emotion
    getPrimaryEmotion() {
        if (!this.faceAttributes?.emotion)
            return null;
        const emotions = this.faceAttributes.emotion;
        return Object.keys(emotions).reduce((a, b) => emotions[a] >
            emotions[b]
            ? a
            : b);
    }
}
// Initialize the FaceDetection model
FaceDetection.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: "users",
            key: "id",
        },
        validate: {
            notEmpty: true,
            isUUID: {
                args: 4,
                msg: "User ID must be a valid UUID",
            },
        },
    },
    eventId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: "events",
            key: "id",
        },
        validate: {
            notEmpty: true,
            isUUID: {
                args: 4,
                msg: "Event ID must be a valid UUID",
            },
        },
    },
    mediaId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: "event_media",
            key: "id",
        },
        validate: {
            notEmpty: true,
            isUUID: {
                args: 4,
                msg: "Media ID must be a valid UUID",
            },
        },
    },
    faceId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    persistedFaceId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    faceRectangle: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        validate: {
            isValidRectangle(value) {
                if (!value || typeof value !== "object") {
                    throw new Error("Face rectangle must be an object");
                }
                const required = ["top", "left", "width", "height"];
                for (const field of required) {
                    if (typeof value[field] !== "number" || value[field] < 0) {
                        throw new Error(`Face rectangle ${field} must be a non-negative number`);
                    }
                }
            },
        },
    },
    faceAttributes: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    },
    confidence: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0,
            max: 1,
        },
    },
    isIdentified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    identifiedUserId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: "users",
            key: "id",
        },
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: db_1.default,
    modelName: "FaceDetection",
    tableName: "face_detections",
    timestamps: true,
    indexes: [
        {
            fields: ["userId"],
        },
        {
            fields: ["eventId"],
        },
        {
            fields: ["mediaId"],
        },
        {
            fields: ["faceId"],
        },
        {
            fields: ["persistedFaceId"],
        },
        {
            fields: ["isIdentified"],
        },
        {
            fields: ["identifiedUserId"],
        },
        {
            fields: ["isActive"],
        },
        {
            fields: ["createdAt"],
        },
        // Composite indexes for common queries
        {
            fields: ["eventId", "isActive"],
        },
        {
            fields: ["userId", "eventId"],
        },
        {
            fields: ["mediaId", "isActive"],
        },
    ],
});
// Define associations
FaceDetection.associate = (models) => {
    // FaceDetection belongs to User (face owner)
    FaceDetection.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
    });
    // FaceDetection belongs to Event
    FaceDetection.belongsTo(models.Event, {
        foreignKey: "eventId",
        as: "event",
    });
    // FaceDetection belongs to EventMedia
    FaceDetection.belongsTo(models.EventMedia, {
        foreignKey: "mediaId",
        as: "media",
    });
    // FaceDetection belongs to User (identified user)
    FaceDetection.belongsTo(models.User, {
        foreignKey: "identifiedUserId",
        as: "identifiedUser",
    });
};
exports.default = FaceDetection;
