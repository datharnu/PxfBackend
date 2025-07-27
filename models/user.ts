import sequelize from "../config/db";
import { DataTypes, Model, Optional, Op } from "sequelize";

interface UserAttributes {
  id: number;
  fullname: string;
  email: string;
  password?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UserCreationAttributes
  extends Optional<UserAttributes, "id" | "createdAt" | "updatedAt"> {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public fullname!: string;
  public email!: string;
  public password?: string;
  public googleId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true, // Changed from UUIDV4 since id is INTEGER
      primaryKey: true,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100], // Name length validation
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true, // Allow null for Google users
      validate: {
        // Custom validator to ensure password exists for non-Google users
        isValidPassword(value: string | null) {
          if (!value && !this.googleId) {
            throw new Error("Password is required for email/password accounts");
          }
        },
      },
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true, // Ensure unique Google IDs
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
            [Op.ne]: null,
          },
        },
      },
    ],
  }
);

export default User;
