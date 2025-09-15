import sequelize from "../config/db";
import { DataTypes, Model, Optional } from "sequelize";

// Define the UserFaceProfile attributes interface
interface UserFaceProfileAttributes {
  id: string;
  userId: string; // User who owns this face profile
  eventId: string; // Event where this face profile is registered
  persistedFaceId: string; // Azure Face API persisted face ID
  faceId: string; // Azure Face API face ID used for enrollment
  enrollmentMediaId: string; // Media used for face enrollment
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
  enrollmentConfidence: number; // Confidence score during enrollment
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (excluding auto-generated fields)
interface UserFaceProfileCreationAttributes
  extends Optional<
    UserFaceProfileAttributes,
    "id" | "createdAt" | "updatedAt" | "isActive"
  > {}

// Define the UserFaceProfile model class
class UserFaceProfile
  extends Model<UserFaceProfileAttributes, UserFaceProfileCreationAttributes>
  implements UserFaceProfileAttributes
{
  public id!: string;
  public userId!: string;
  public eventId!: string;
  public persistedFaceId!: string;
  public faceId!: string;
  public enrollmentMediaId!: string;
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
  public enrollmentConfidence!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association properties
  public user?: any;
  public event?: any;
  public enrollmentMedia?: any;

  // Method to get face rectangle as a formatted string
  public getFaceRectangleString(): string {
    return `${this.faceRectangle.left},${this.faceRectangle.top},${this.faceRectangle.width},${this.faceRectangle.height}`;
  }

  // Method to check if enrollment has high confidence
  public isHighConfidenceEnrollment(threshold: number = 0.7): boolean {
    return this.enrollmentConfidence >= threshold;
  }

  // Method to get primary emotion during enrollment
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

// Initialize the UserFaceProfile model
UserFaceProfile.init(
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
    persistedFaceId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    faceId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    enrollmentMediaId: {
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
          msg: "Enrollment media ID must be a valid UUID",
        },
      },
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
    enrollmentConfidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1,
      },
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
  }
);

// Define associations
(UserFaceProfile as any).associate = (models: any) => {
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

export default UserFaceProfile;
