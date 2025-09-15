import sequelize from "../config/db";
import { DataTypes, Model, Optional } from "sequelize";

// Define media type enum
export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
}

// Define the EventMedia attributes interface
interface EventMediaAttributes {
  id: string;
  eventId: string;
  uploadedBy: string; // User ID who uploaded the media
  mediaType: MediaType;
  mediaUrl: string; // URL/path to the uploaded media
  fileName: string; // Original filename
  fileSize: number; // File size in bytes
  mimeType: string; // MIME type of the file
  cloudinaryPublicId?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (excluding auto-generated fields)
interface EventMediaCreationAttributes
  extends Optional<
    EventMediaAttributes,
    "id" | "createdAt" | "updatedAt" | "isActive"
  > {}

// Define the EventMedia model class
class EventMedia
  extends Model<EventMediaAttributes, EventMediaCreationAttributes>
  implements EventMediaAttributes
{
  public id!: string;
  public eventId!: string;
  public uploadedBy!: string;
  public mediaType!: MediaType;
  public mediaUrl!: string;
  public cloudinaryPublicId?: string;
  public fileName!: string;
  public fileSize!: number;
  public mimeType!: string;
  public isActive?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  uploader: any;

  // Association properties
  public event?: any;

  // Method to get file size in human readable format
  public getFileSizeFormatted(): string {
    const bytes = this.fileSize;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  // Method to check if media is an image
  public isImage(): boolean {
    return this.mediaType === MediaType.IMAGE;
  }

  // Method to check if media is a video
  public isVideo(): boolean {
    return this.mediaType === MediaType.VIDEO;
  }
}

// Initialize the EventMedia model
EventMedia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.UUID,
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
      type: DataTypes.UUID,
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
      type: DataTypes.ENUM(...Object.values(MediaType)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(MediaType)],
          msg: "Media type must be either 'image' or 'video'",
        },
      },
    },
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: {
          msg: "Media URL must be a valid URL",
        },
      },
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    fileSize: {
      type: DataTypes.BIGINT,
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
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    cloudinaryPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "cloudinary_public_id",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
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
  }
);

// Define associations
(EventMedia as any).associate = (models: any) => {
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

export default EventMedia;
