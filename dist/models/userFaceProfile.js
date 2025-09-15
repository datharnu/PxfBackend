"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
// Define the UserFaceProfile model class
class UserFaceProfile extends sequelize_1.Model {
    // Method to get face rectangle as a formatted string
    getFaceRectangleString() {
        return `${this.faceRectangle.left},${this.faceRectangle.top},${this.faceRectangle.width},${this.faceRectangle.height}`;
    }
    // Method to check if enrollment has high confidence
    isHighConfidenceEnrollment(threshold = 0.7) {
        return this.enrollmentConfidence >= threshold;
    }
    // Method to get primary emotion during enrollment
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
// Initialize the UserFaceProfile model
UserFaceProfile.init({
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
    persistedFaceId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
        },
    },
    faceId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    enrollmentMediaId: {
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
                msg: "Enrollment media ID must be a valid UUID",
            },
        },
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
    enrollmentConfidence: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0,
            max: 1,
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
    modelName: "UserFaceProfile",
    tableName: "user_face_profiles",
    timestamps: true,
    indexes: [
        {
            fields: ["userId"],
        },
        {
            fields: ["eventId"],
        },
        {
            fields: ["persistedFaceId"],
            unique: true,
        },
        {
            fields: ["faceId"],
        },
        {
            fields: ["enrollmentMediaId"],
        },
        {
            fields: ["isActive"],
        },
        {
            fields: ["createdAt"],
        },
        // Composite indexes for common queries
        {
            fields: ["userId", "eventId"],
            unique: true, // One face profile per user per event
        },
        {
            fields: ["eventId", "isActive"],
        },
    ],
});
// Define associations
UserFaceProfile.associate = (models) => {
    // UserFaceProfile belongs to User
    UserFaceProfile.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
    });
    // UserFaceProfile belongs to Event
    UserFaceProfile.belongsTo(models.Event, {
        foreignKey: "eventId",
        as: "event",
    });
    // UserFaceProfile belongs to EventMedia (enrollment media)
    UserFaceProfile.belongsTo(models.EventMedia, {
        foreignKey: "enrollmentMediaId",
        as: "enrollmentMedia",
    });
};
exports.default = UserFaceProfile;
