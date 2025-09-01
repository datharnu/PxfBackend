"use strict";
// import sequelize from "../config/db";
// import { DataTypes, Model, Optional, Op } from "sequelize";
// import validator from "validator";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";
// interface UserAttributes {
//   id: number;
//   fullname: string;
//   email: string;
//   password?: string;
//   googleId?: string;
//   isActive?: boolean;
//   refreshToken?: string;
//   createdAt: Date;
//   updatedAt: Date;
//   verificationCode?: string;
//   verificationCodeExpires?: Date;
// }
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// // eslint-disable-next-line @typescript-eslint/no-empty-object-type
// interface UserCreationAttributes
//   extends Optional<UserAttributes, "id" | "createdAt" | "updatedAt"> {}
// class User
//   extends Model<UserAttributes, UserCreationAttributes>
//   implements UserAttributes
// {
//   public id!: number;
//   public fullname!: string;
//   public email!: string;
//   public password?: string;
//   public googleId?: string;
//   public isActive?: boolean;
//   public refreshToken?: string;
//   public readonly createdAt!: Date;
//   public readonly updatedAt!: Date;
//   public verificationCode?: string;
//   public verificationCodeExpires?: Date;
//   public async hashPassword(password: string): Promise<string> {
//     const salt = await bcrypt.genSalt(10);
//     return bcrypt.hash(password, salt);
//   }
//   public async comparePassword(password: string): Promise<boolean> {
//     if (!this.password) return false;
//     return bcrypt.compare(password, this.password);
//   }
//   public async createJWT(): Promise<string> {
//     const JWT_SECRET = process.env.JWT_SECRET;
//     if (!JWT_SECRET) {
//       throw new Error("JWT_SECRET is not defined in environment variables");
//     }
//     const JWT_LIFETIME = process.env.JWT_LIFETIME || "1d";
//     return jwt.sign(
//       {
//         id: this.id,
//         email: this.email,
//         isActive: this.isActive,
//       },
//       JWT_SECRET,
//       {
//         expiresIn: JWT_LIFETIME,
//       } as jwt.SignOptions // Explicit type assertion
//     );
//   }
//   public async generateRefreshToken(user: User): Promise<string> {
//     const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
//     if (!REFRESH_TOKEN_SECRET) {
//       throw new Error(
//         "REFRESH_TOKEN_SECRET is not defined in environment variables"
//       );
//     }
//     const REFRESH_TOKEN_LIFETIME = process.env.REFRESH_TOKEN_LIFETIME || "7d";
//     return jwt.sign(
//       { id: user.id },
//       REFRESH_TOKEN_SECRET,
//       {
//         expiresIn: REFRESH_TOKEN_LIFETIME,
//       } as jwt.SignOptions // Explicit type assertion
//     );
//   }
// }
// User.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true, // Changed from UUIDV4 since id is INTEGER
//       primaryKey: true,
//     },
//     fullname: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         notEmpty: true,
//         len: [2, 100], // Name length validation
//       },
//     },
//     email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//       validate: {
//         isEmail: true,
//         notEmpty: true,
//       },
//     },
//     password: {
//       type: DataTypes.STRING,
//       allowNull: true, // Allow null for Google users
//       validate: {
//         // Custom validator to ensure password exists for non-Google users
//         isValidPassword(value: string | null) {
//           if (!value && !this.googleId) {
//             throw new Error("Password is required for email/password accounts");
//           }
//         },
//       },
//     },
//     verificationCode: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     verificationCodeExpires: {
//       type: DataTypes.DATE,
//       allowNull: true,
//     },
//     isActive: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//     },
//     refreshToken: {
//       type: DataTypes.TEXT,
//       allowNull: true,
//     },
//     googleId: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       unique: true, // Ensure unique Google IDs
//     },
//     createdAt: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//     updatedAt: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//   },
//   {
//     sequelize,
//     modelName: "User",
//     tableName: "users", // Explicit table name
//     timestamps: true,
//     indexes: [
//       {
//         unique: true,
//         fields: ["email"],
//       },
//       {
//         unique: true,
//         fields: ["googleId"],
//         where: {
//           googleId: {
//             [Op.ne]: null,
//           },
//         },
//       },
//     ],
//   }
// );
// export default User;
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class User extends sequelize_1.Model {
    async hashPassword(password) {
        const salt = await bcryptjs_1.default.genSalt(12); // Increased salt rounds for better security
        return bcryptjs_1.default.hash(password, salt);
    }
    async comparePassword(password) {
        if (!this.password)
            return false;
        return bcryptjs_1.default.compare(password, this.password);
    }
    async createJWT() {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const JWT_LIFETIME = process.env.JWT_LIFETIME || "15m";
        return jsonwebtoken_1.default.sign({
            id: this.id,
            email: this.email,
            isActive: this.isActive,
            tokenVersion: this.tokenVersion || 0,
        }, JWT_SECRET, {
            expiresIn: JWT_LIFETIME,
        } // Explicit type assertion
        );
    }
    async createRefreshToken() {
        const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
        if (!REFRESH_TOKEN_SECRET) {
            throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
        }
        const REFRESH_TOKEN_LIFETIME = process.env.REFRESH_TOKEN_LIFETIME || "7d";
        return jsonwebtoken_1.default.sign({ id: this.id, tokenVersion: this.tokenVersion || 0 }, REFRESH_TOKEN_SECRET, {
            expiresIn: REFRESH_TOKEN_LIFETIME,
        } // Explicit type assertion
        );
    }
    // Method to invalidate all tokens
    async invalidateAllTokens() {
        this.tokenVersion = (this.tokenVersion || 0) + 1;
        this.refreshToken = null;
        await this.save();
    }
    async generateVerificationCode() {
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        const salt = await bcryptjs_1.default.genSalt(12);
        this.verificationCode = await bcryptjs_1.default.hash(code, salt);
        this.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await this.save();
        return code; // Return plain text code to send via email
    }
    async compareVerificationCode(code) {
        if (!this.verificationCode || !this.verificationCodeExpires) {
            return false;
        }
        // Check expiration first
        if (new Date() > this.verificationCodeExpires) {
            return false;
        }
        // Compare hashed codes
        return bcryptjs_1.default.compare(code, this.verificationCode);
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    fullname: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100],
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
        set(value) {
            // Always store email in lowercase
            this.setDataValue("email", value.toLowerCase().trim());
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
    verificationCode: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    verificationCodeExpires: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    lastPasswordResetRequest: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    tokenVersion: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    refreshToken: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    googleId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        unique: true,
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
    tableName: "users",
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
        {
            fields: ["verificationCodeExpires"],
        },
        {
            fields: ["lastPasswordResetRequest"],
        },
    ],
});
// Define associations
User.associate = (models) => {
    // User can have many Events
    User.hasMany(models.Event, {
        foreignKey: "createdBy",
        as: "events",
    });
    // User can have many EventMedia (uploads)
    User.hasMany(models.EventMedia, {
        foreignKey: "uploadedBy",
        as: "uploadedMedia",
    });
};
exports.default = User;
