import sequelize from "../config/db";
import { DataTypes, Model, Optional } from "sequelize";

// Define the guest limit enum values
export enum GuestLimit {
  TEN = "10",
  ONE_HUNDRED = "100",
  TWO_FIFTY = "250",
  FIVE_HUNDRED = "500",
  EIGHT_HUNDRED = "800",
  ONE_THOUSAND = "1000",
  CUSTOM = "CUSTOM",
}

// Define the photo capture limit enum values
export enum PhotoCapLimit {
  FIVE = "5",
  TEN = "10",
  FIFTEEN = "15",
  TWENTY = "20",
  TWENTY_FIVE = "25",
  CUSTOM = "CUSTOM",
}

// Payment status for event plan
export enum PaymentStatus {
  FREE = "FREE",
  PENDING = "PENDING",
  PAID = "PAID",
}

// Define the Event attributes interface
interface EventAttributes {
  id: string;
  title: string;
  description: string;
  eventFlyer?: string; // URL/path to the cover photo/flyer
  guestLimit: GuestLimit;
  photoCapLimit: PhotoCapLimit;
  customGuestLimit?: number | null;
  customPhotoCapLimit?: number | null;
  createdBy: string; // User ID who created the event
  isActive?: boolean;
  eventDate?: Date;
  eventSlug?: string; // Unique URL slug for accessing the event
  qrCodeData?: string; // QR code data URL (base64)
  accessPassword?: string; // Optional password for event access
  isPasswordProtected?: boolean; // Whether the event requires a password
  paymentStatus?: PaymentStatus;
  planPrice?: number | null; // NGN
  paystackReference?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (excluding auto-generated fields)
interface EventCreationAttributes
  extends Optional<
    EventAttributes,
    "id" | "createdAt" | "updatedAt" | "isActive"
  > {}

// Define the Event model class
class Event
  extends Model<EventAttributes, EventCreationAttributes>
  implements EventAttributes
{
  public id!: string;
  public title!: string;
  public description!: string;
  public eventFlyer?: string;
  public guestLimit!: GuestLimit;
  public photoCapLimit!: PhotoCapLimit;
  public customGuestLimit?: number | null;
  public customPhotoCapLimit?: number | null;
  public createdBy!: string;
  public isActive?: boolean;
  public eventDate?: Date;
  public eventSlug?: string;
  public qrCodeData?: string;
  public accessPassword?: string;
  public isPasswordProtected?: boolean;
  public paymentStatus?: PaymentStatus;
  public planPrice?: number | null;
  public paystackReference?: string | null;
  public paidAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Method to check if event is upcoming
  public isUpcoming(): boolean {
    if (!this.eventDate) return false;
    return new Date() < this.eventDate;
  }

  // Method to check if event is today
  public isToday(): boolean {
    if (!this.eventDate) return false;
    const today = new Date();
    const eventDate = new Date(this.eventDate);
    return (
      today.getFullYear() === eventDate.getFullYear() &&
      today.getMonth() === eventDate.getMonth() &&
      today.getDate() === eventDate.getDate()
    );
  }

  // Method to get the event access URL
  public getAccessUrl(): string {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return `${baseUrl}/event/${this.eventSlug}`;
  }

  // Method to check if password is required
  public requiresPassword(): boolean {
    return this.isPasswordProtected === true && !!this.accessPassword;
  }
}

// Initialize the Event model
Event.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 2000],
      },
    },
    eventFlyer: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: {
          msg: "Event flyer must be a valid URL",
        },
      },
    },
    guestLimit: {
      type: DataTypes.ENUM(...Object.values(GuestLimit)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(GuestLimit)],
          msg: "Guest limit must be one of: 10, 100, 250, 500, 800, 1000, CUSTOM",
        },
      },
    },
    photoCapLimit: {
      type: DataTypes.ENUM(...Object.values(PhotoCapLimit)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(PhotoCapLimit)],
          msg: "Photo capture limit must be one of: 5, 10, 15, 20, 25, CUSTOM",
        },
      },
    },
    customGuestLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        isInt: true,
        customIsRequiredWhenGuestCustom(this: any, value: number | null) {
          if (this.guestLimit === GuestLimit.CUSTOM) {
            if (!value || value <= 1000) {
              throw new Error(
                "customGuestLimit must be > 1000 when guestLimit is CUSTOM"
              );
            }
          }
        },
      },
    },
    customPhotoCapLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        isInt: true,
        customIsRequiredWhenPhotoCustom(this: any, value: number | null) {
          if (this.photoCapLimit === PhotoCapLimit.CUSTOM) {
            if (!value || value <= 25) {
              throw new Error(
                "customPhotoCapLimit must be > 25 when photoCapLimit is CUSTOM"
              );
            }
          }
        },
      },
    },
    createdBy: {
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
          msg: "Created by must be a valid UUID",
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    eventDate: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
        isNotPast(value: Date) {
          if (value) {
            const eventDateObj = new Date(value);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            if (eventDateObj < todayStart) {
              throw new Error("Event date cannot be in the past");
            }
          }
        },
      },
    },
    eventSlug: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        len: [10, 50],
      },
    },
    qrCodeData: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // accessPassword: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   validate: {
    //     len: [4, 50],
    //   },
    // },
    accessPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        // Remove the length validation since we're storing hashed passwords
        // which will be much longer than 50 characters
        customPasswordValidation(value: string | null) {
          // Only validate if password protection is enabled
          if (this.isPasswordProtected && !value) {
            throw new Error(
              "Password is required when password protection is enabled"
            );
          }
        },
      },
    },
    isPasswordProtected: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    paymentStatus: {
      type: DataTypes.ENUM("FREE", "PENDING", "PAID"),
      allowNull: false,
      defaultValue: "FREE",
    },
    planPrice: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    paystackReference: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: "Event",
    tableName: "events",
    timestamps: true,
    indexes: [
      {
        fields: ["createdBy"],
      },
      {
        fields: ["isActive"],
      },
      {
        fields: ["eventDate"],
      },
      {
        fields: ["guestLimit"],
      },
      {
        fields: ["photoCapLimit"],
      },
    ],
  }
);

// Define associations
(Event as any).associate = (models: any) => {
  // Event belongs to User (creator)
  Event.belongsTo(models.User, {
    foreignKey: "createdBy",
    as: "creator",
  });

  // Event has many EventMedia
  Event.hasMany(models.EventMedia, {
    foreignKey: "eventId",
    as: "media",
  });
};

export default Event;
