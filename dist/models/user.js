"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
class User extends sequelize_1.Model {
}
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true, // Changed from UUIDV4 since id is INTEGER
        primaryKey: true,
    },
    fullname: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100], // Name length validation
        },
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true, // Allow null for Google users
        validate: {
            // Custom validator to ensure password exists for non-Google users
            isValidPassword(value) {
                if (!value && !this.googleId) {
                    throw new Error("Password is required for email/password accounts");
                }
            },
        },
    },
    googleId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        unique: true, // Ensure unique Google IDs
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
    modelName: "User",
    tableName: "users", // Explicit table name
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ["email"],
        },
        {
            unique: true,
            fields: ["googleId"],
            where: {
                googleId: {
                    [sequelize_1.Op.ne]: null,
                },
            },
        },
    ],
});
exports.default = User;
