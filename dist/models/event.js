"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoCapLimit = exports.GuestLimit = void 0;
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
// Define the guest limit enum values
var GuestLimit;
(function (GuestLimit) {
    GuestLimit["TEN"] = "10";
    GuestLimit["ONE_HUNDRED"] = "100";
    GuestLimit["TWO_FIFTY"] = "250";
    GuestLimit["FIVE_HUNDRED"] = "500";
    GuestLimit["EIGHT_HUNDRED"] = "800";
    GuestLimit["ONE_THOUSAND_PLUS"] = "1000+";
})(GuestLimit || (exports.GuestLimit = GuestLimit = {}));
// Define the photo capture limit enum values
var PhotoCapLimit;
(function (PhotoCapLimit) {
    PhotoCapLimit["FIVE"] = "5";
    PhotoCapLimit["TEN"] = "10";
    PhotoCapLimit["FIFTEEN"] = "15";
    PhotoCapLimit["TWENTY"] = "20";
    PhotoCapLimit["TWENTY_FIVE"] = "25";
})(PhotoCapLimit || (exports.PhotoCapLimit = PhotoCapLimit = {}));
// Define the Event model class
class Event extends sequelize_1.Model {
    // Method to check if event is upcoming
    isUpcoming() {
        if (!this.eventDate)
            return false;
        return new Date() < this.eventDate;
    }
    // Method to check if event is today
    isToday() {
        if (!this.eventDate)
            return false;
        const today = new Date();
        const eventDate = new Date(this.eventDate);
        return (today.getFullYear() === eventDate.getFullYear() &&
            today.getMonth() === eventDate.getMonth() &&
            today.getDate() === eventDate.getDate());
    }
    // Method to get the event access URL
    getAccessUrl() {
        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return `${baseUrl}/event/${this.eventSlug}`;
    }
    // Method to check if password is required
    requiresPassword() {
        return this.isPasswordProtected === true && !!this.accessPassword;
    }
}
// Initialize the Event model
Event.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [3, 200],
        },
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [10, 2000],
        },
    },
    eventFlyer: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: {
                msg: "Event flyer must be a valid URL",
            },
        },
    },
    guestLimit: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(GuestLimit)),
        allowNull: false,
        validate: {
            isIn: {
                args: [Object.values(GuestLimit)],
                msg: "Guest limit must be one of: 10, 100, 250, 500, 800, 1000+",
            },
        },
    },
    photoCapLimit: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(PhotoCapLimit)),
        allowNull: false,
        validate: {
            isIn: {
                args: [Object.values(PhotoCapLimit)],
                msg: "Photo capture limit must be one of: 5, 10, 15, 20, 25",
            },
        },
    },
    createdBy: {
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
                msg: "Created by must be a valid UUID",
            },
        },
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    eventDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        validate: {
            isDate: true,
            isAfterToday(value) {
                if (value && new Date(value) < new Date()) {
                    throw new Error("Event date must be in the future");
                }
            },
        },
    },
    eventSlug: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [10, 50],
        },
    },
    qrCodeData: {
        type: sequelize_1.DataTypes.TEXT,
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
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            // Remove the length validation since we're storing hashed passwords
            // which will be much longer than 50 characters
            customPasswordValidation(value) {
                // Only validate if password protection is enabled
                if (this.isPasswordProtected && !value) {
                    throw new Error("Password is required when password protection is enabled");
                }
            },
        },
    },
    isPasswordProtected: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
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
});
// Define associations
Event.associate = (models) => {
    // Event belongs to User (creator)
    Event.belongsTo(models.User, {
        foreignKey: "createdBy",
        as: "creator",
    });
};
exports.default = Event;
