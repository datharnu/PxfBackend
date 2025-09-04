"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const sequelize_1 = require("sequelize");
class CustomPricingTier extends sequelize_1.Model {
}
CustomPricingTier.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    minGuests: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    maxGuests: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
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
    modelName: "CustomPricingTier",
    tableName: "custom_pricing_tiers",
    timestamps: true,
    indexes: [{ fields: ["minGuests", "maxGuests"] }],
});
exports.default = CustomPricingTier;
