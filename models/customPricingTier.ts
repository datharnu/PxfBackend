import sequelize from "../config/db";
import { DataTypes, Model, Optional } from "sequelize";

interface CustomPricingTierAttributes {
  id: string;
  minGuests: number;
  maxGuests?: number | null;
  priceNgn: number;
  createdAt: Date;
  updatedAt: Date;
}

type CustomPricingTierCreation = Optional<
  CustomPricingTierAttributes,
  "id" | "maxGuests" | "createdAt" | "updatedAt"
>;

class CustomPricingTier
  extends Model<CustomPricingTierAttributes, CustomPricingTierCreation>
  implements CustomPricingTierAttributes
{
  public id!: string;
  public minGuests!: number;
  public maxGuests?: number | null;
  public priceNgn!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CustomPricingTier.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    minGuests: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maxGuests: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    priceNgn: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    modelName: "CustomPricingTier",
    tableName: "custom_pricing_tiers",
    timestamps: true,
    indexes: [{ fields: ["minGuests", "maxGuests"] }],
  }
);

export default CustomPricingTier;
