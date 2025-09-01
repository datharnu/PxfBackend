"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaType = void 0;
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
// Define media type enum
var MediaType;
(function (MediaType) {
    MediaType["IMAGE"] = "image";
    MediaType["VIDEO"] = "video";
})(MediaType || (exports.MediaType = MediaType = {}));
// Define the EventMedia model class
class EventMedia extends sequelize_1.Model {
    // Method to get file size in human readable format
    getFileSizeFormatted() {
        const bytes = this.fileSize;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        if (bytes === 0)
            return "0 Bytes";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
    }
    // Method to check if media is an image
    isImage() {
        return this.mediaType === MediaType.IMAGE;
    }
    // Method to check if media is a video
    isVideo() {
        return this.mediaType === MediaType.VIDEO;
    }
}
// Initialize the EventMedia model
EventMedia.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
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
    uploadedBy: {
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
                msg: "Uploaded by must be a valid UUID",
            },
        },
    },
    mediaType: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(MediaType)),
        allowNull: false,
        validate: {
            isIn: {
                args: [Object.values(MediaType)],
                msg: "Media type must be either 'image' or 'video'",
            },
        },
    },
    mediaUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            isUrl: {
                msg: "Media URL must be a valid URL",
            },
        },
    },
    fileName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255],
        },
    },
    fileSize: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        validate: {
            min: {
                args: [1],
                msg: "File size must be greater than 0",
            },
            max: {
                args: [100 * 1024 * 1024], // 100MB max
                msg: "File size must be less than 100MB",
            },
        },
    },
    mimeType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 100],
        },
    },
    cloudinaryPublicId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: "cloudinary_public_id",
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
    modelName: "EventMedia",
    tableName: "event_media",
    timestamps: true,
    indexes: [
        {
            fields: ["eventId"],
        },
        {
            fields: ["uploadedBy"],
        },
        {
            fields: ["mediaType"],
        },
        {
            fields: ["isActive"],
        },
        {
            fields: ["createdAt"],
        },
    ],
});
// Define associations
EventMedia.associate = (models) => {
    // EventMedia belongs to Event
    EventMedia.belongsTo(models.Event, {
        foreignKey: "eventId",
        as: "event",
    });
    // EventMedia belongs to User (uploader)
    EventMedia.belongsTo(models.User, {
        foreignKey: "uploadedBy",
        as: "uploader",
    });
};
exports.default = EventMedia;
