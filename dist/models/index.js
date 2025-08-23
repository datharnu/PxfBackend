"use strict";
// import fs from "fs";
// import path from "path";
// import { Sequelize, DataTypes } from "sequelize";
// import { config as dotenvConfig } from "dotenv";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = exports.Event = exports.User = void 0;
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const dotenv_1 = require("dotenv");
// Import your models directly
const user_1 = __importDefault(require("./user"));
exports.User = user_1.default;
const event_1 = __importDefault(require("./event"));
exports.Event = event_1.default;
(0, dotenv_1.config)(); // Load .env
const basename = path_1.default.basename(__filename);
const env = process.env.NODE_ENV || "development";
const configPath = path_1.default.resolve(__dirname, "../config/config.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require(configPath)[env];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = {};
let sequelize;
if (config.use_env_variable) {
    exports.sequelize = sequelize = new sequelize_1.Sequelize(process.env[config.use_env_variable], config);
}
else {
    exports.sequelize = sequelize = new sequelize_1.Sequelize(config.database, config.username, config.password, config);
}
// Add models to db object
db.User = user_1.default;
db.Event = event_1.default;
// Apply associations
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});
db.sequelize = sequelize;
db.Sequelize = sequelize_1.Sequelize;
exports.default = db;
