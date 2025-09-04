"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
class PlanPricing extends sequelize_1.Model {
}
PlanPricing.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    guestLimit: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    photoCapLimit: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    priceNgn: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
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
    modelName: "PlanPricing",
    tableName: "plan_pricing",
    timestamps: true,
    indexes: [{ fields: ["guestLimit", "photoCapLimit"], unique: true }],
});
exports.default = PlanPricing;
