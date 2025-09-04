import sequelize from "../config/db";
import { DataTypes, Model, Optional } from "sequelize";

interface PlanPricingAttributes {
  id: string;
  guestLimit: string;
  photoCapLimit: string;
  priceNgn: number;
  createdAt: Date;
  updatedAt: Date;
}

type PlanPricingCreation = Optional<
  PlanPricingAttributes,
  "id" | "createdAt" | "updatedAt"
>;

class PlanPricing
  extends Model<PlanPricingAttributes, PlanPricingCreation>
  implements PlanPricingAttributes
{
  public id!: string;
  public guestLimit!: string;
  public photoCapLimit!: string;
  public priceNgn!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PlanPricing.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    guestLimit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    photoCapLimit: {
      type: DataTypes.STRING,
      allowNull: false,
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
    modelName: "PlanPricing",
    tableName: "plan_pricing",
    timestamps: true,
    indexes: [{ fields: ["guestLimit", "photoCapLimit"], unique: true }],
  }
);

export default PlanPricing;
