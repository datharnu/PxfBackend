"use strict";
// import fs from "fs";
// import path from "path";
// import { Sequelize, DataTypes } from "sequelize";
// import { config as dotenvConfig } from "dotenv";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = exports.UserFaceProfile = exports.FaceDetection = exports.CustomPricingTier = exports.PlanPricing = exports.EventMedia = exports.Event = exports.User = void 0;
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const dotenv_1 = require("dotenv");
// Import your models directly
const user_1 = __importDefault(require("./user"));
exports.User = user_1.default;
const event_1 = __importDefault(require("./event"));
exports.Event = event_1.default;
const eventMedia_1 = __importDefault(require("./eventMedia"));
exports.EventMedia = eventMedia_1.default;
const planPricing_1 = __importDefault(require("./planPricing"));
exports.PlanPricing = planPricing_1.default;
const customPricingTier_1 = __importDefault(require("./customPricingTier"));
exports.CustomPricingTier = customPricingTier_1.default;
const faceDetection_1 = __importDefault(require("./faceDetection"));
exports.FaceDetection = faceDetection_1.default;
const userFaceProfile_1 = __importDefault(require("./userFaceProfile"));
exports.UserFaceProfile = userFaceProfile_1.default;
(0, dotenv_1.config)(); // Load .env
const basename = path_1.default.basename(__filename);
const env = process.env.NODE_ENV || "development";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = {};
let sequelize;
// Determine if SSL is required
const requireSSL = process.env.DB_SSL === "true";
const isProduction = process.env.NODE_ENV === "production";
// Use environment variables for database configuration
const databaseConfig = {
    database: process.env.DB_NAME || process.env.DATABASE_NAME,
    username: process.env.DB_USER || process.env.DATABASE_USER,
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD,
    host: process.env.DB_HOST || process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || "5432"),
    dialect: (process.env.DB_DIALECT || "postgres"),
    logging: env === "development" ? console.log : false,
    dialectOptions: requireSSL
        ? {
            ssl: {
                require: true,
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
            },
        }
        : isProduction
            ? {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            }
            : {
                // For development without SSL
                ssl: false,
            },
};
// Check if using a connection string (common in production)
if (process.env.DATABASE_URL) {
    exports.sequelize = sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL, {
        dialect: databaseConfig.dialect,
        logging: databaseConfig.logging,
        dialectOptions: databaseConfig.dialectOptions,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    });
}
else {
    // Use individual connection parameters
    exports.sequelize = sequelize = new sequelize_1.Sequelize(databaseConfig.database, databaseConfig.username, databaseConfig.password, {
        host: databaseConfig.host,
        port: databaseConfig.port,
        dialect: databaseConfig.dialect,
        logging: databaseConfig.logging,
        dialectOptions: databaseConfig.dialectOptions,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    });
}
// Add models to db object
db.User = user_1.default;
db.Event = event_1.default;
db.EventMedia = eventMedia_1.default;
db.PlanPricing = planPricing_1.default;
db.CustomPricingTier = customPricingTier_1.default;
db.FaceDetection = faceDetection_1.default;
db.UserFaceProfile = userFaceProfile_1.default;
// Apply associations
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});
db.sequelize = sequelize;
db.Sequelize = sequelize_1.Sequelize;
exports.default = db;
