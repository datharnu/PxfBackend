import sequelize from "../config/db";
import { DataTypes, Model, Optional } from "sequelize";

// Define the FaceDetection attributes interface
interface FaceDetectionAttributes {
  id: string;
  userId: string; // User who owns this face
  eventId: string; // Event where this face was detected
  mediaId: string; // Media where this face was found
  faceId: string; // Azure Face API face ID
  persistedFaceId?: string; // Azure Face API persisted face ID for identification
  faceRectangle: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  faceAttributes?: {
    age?: number;
    gender?: string;
    smile?: number;
    facialHair?: {
      moustache: number;
      beard: number;
      sideburns: number;
    };
    glasses?: string;
    emotion?: {
      anger: number;
      contempt: number;
      disgust: number;
      fear: number;
      happiness: number;
      neutral: number;
      sadness: number;
      surprise: number;
    };
  };
  confidence: number; // Confidence score of the face detection
  isIdentified: boolean; // Whether this face has been identified to a user
  identifiedUserId?: string; // User ID if face has been identified
  frameTimestamp?: number; // For video frames - timestamp in seconds
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (excluding auto-generated fields)
interface FaceDetectionCreationAttributes
  extends Optional<
    FaceDetectionAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "isActive"
    | "isIdentified"
    | "identifiedUserId"
    | "persistedFaceId"
  > {}

// Define the FaceDetection model class
class FaceDetection
  extends Model<FaceDetectionAttributes, FaceDetectionCreationAttributes>
  implements FaceDetectionAttributes
{
  public id!: string;
  public userId!: string;
  public eventId!: string;
  public mediaId!: string;
  public faceId!: string;
  public persistedFaceId?: string;
  public faceRectangle!: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  public faceAttributes?: {
    age?: number;
    gender?: string;
    smile?: number;
    facialHair?: {
      moustache: number;
      beard: number;
      sideburns: number;
    };
    glasses?: string;
    emotion?: {
      anger: number;
      contempt: number;
      disgust: number;
      fear: number;
      happiness: number;
      neutral: number;
      sadness: number;
      surprise: number;
    };
  };
  public confidence!: number;
  public isIdentified!: boolean;
  public identifiedUserId?: string;
  public frameTimestamp?: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association properties
  public media?: any;
  public user?: any;
  public event?: any;
  public identifiedUser?: any;

  // Method to get face rectangle as a formatted string
  public getFaceRectangleString(): string {
    return `${this.faceRectangle.left},${this.faceRectangle.top},${this.faceRectangle.width},${this.faceRectangle.height}`;
  }

  // Method to check if face has high confidence
  public isHighConfidence(threshold: number = 0.7): boolean {
    return this.confidence >= threshold;
  }

  // Method to get primary emotion
  public getPrimaryEmotion(): string | null {
    if (!this.faceAttributes?.emotion) return null;

    const emotions = this.faceAttributes.emotion;
    return Object.keys(emotions).reduce((a, b) =>
      emotions[a as keyof typeof emotions] >
      emotions[b as keyof typeof emotions]
        ? a
        : b
    );
  }
}

// Initialize the FaceDetection model
FaceDetection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
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
          msg: "User ID must be a valid UUID",
        },
      },
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
    mediaId: {
      type: DataTypes.UUID,
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
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    persistedFaceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    faceRectangle: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidRectangle(value: any) {
          if (!value || typeof value !== "object") {
            throw new Error("Face rectangle must be an object");
          }
          const required = ["top", "left", "width", "height"];
          for (const field of required) {
            if (typeof value[field] !== "number" || value[field] < 0) {
              throw new Error(
                `Face rectangle ${field} must be a non-negative number`
              );
            }
          }
        },
      },
    },
    faceAttributes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1,
      },
    },
    isIdentified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    identifiedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    frameTimestamp: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "For video frames - timestamp in seconds",
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
  }
);

// Define associations
(FaceDetection as any).associate = (models: any) => {
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

export default FaceDetection;
