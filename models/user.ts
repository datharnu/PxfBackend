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

import sequelize from "../config/db";
import { DataTypes, Model, Optional, Op } from "sequelize";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

interface UserAttributes {
  id: number;
  fullname: string;
  email: string;
  password?: string;
  googleId?: string;
  isActive?: boolean;
  refreshToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
  verificationCode?: string | null;
  verificationCodeExpires?: Date | null;
  lastPasswordResetRequest?: Date;
  tokenVersion?: number;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "tokenVersion"
    | "lastPasswordResetRequest"
  > {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public fullname!: string;
  public email!: string;
  public password?: string;
  public googleId?: string;
  public isActive?: boolean;
  public refreshToken?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public verificationCode?: string | null;
  public verificationCodeExpires?: Date | null;
  public lastPasswordResetRequest?: Date;
  public tokenVersion?: number;

  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
    return bcrypt.hash(password, salt);
  }

  public async comparePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  }

  public async createJWT(): Promise<string> {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const JWT_LIFETIME = process.env.JWT_LIFETIME || "15m";

    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        isActive: this.isActive,
        tokenVersion: this.tokenVersion || 0,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_LIFETIME,
      } as jwt.SignOptions // Explicit type assertion
    );
  }

  public async createRefreshToken(): Promise<string> {
    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
    if (!REFRESH_TOKEN_SECRET) {
      throw new Error(
        "REFRESH_TOKEN_SECRET is not defined in environment variables"
      );
    }

    const REFRESH_TOKEN_LIFETIME = process.env.REFRESH_TOKEN_LIFETIME || "7d";

    return jwt.sign(
      { id: this.id, tokenVersion: this.tokenVersion || 0 },
      REFRESH_TOKEN_SECRET,
      {
        expiresIn: REFRESH_TOKEN_LIFETIME,
      } as jwt.SignOptions // Explicit type assertion
    );
  }

  // Method to invalidate all tokens
  public async invalidateAllTokens(): Promise<void> {
    this.tokenVersion = (this.tokenVersion || 0) + 1;
    this.refreshToken = null;
    await this.save();
  }
  public async generateVerificationCode(): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const salt = await bcrypt.genSalt(12);
    this.verificationCode = await bcrypt.hash(code, salt);
    this.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.save();
    return code; // Return plain text code to send via email
  }

  public async compareVerificationCode(code: string): Promise<boolean> {
    if (!this.verificationCode || !this.verificationCodeExpires) {
      return false;
    }

    // Check expiration first
    if (new Date() > this.verificationCodeExpires) {
      return false;
    }

    // Compare hashed codes
    return bcrypt.compare(code, this.verificationCode);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
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
      set(value: string) {
        // Always store email in lowercase
        this.setDataValue("email", value.toLowerCase().trim());
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
    verificationCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verificationCodeExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastPasswordResetRequest: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
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
            [Op.ne]: null,
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
  }
);

// Define associations
(User as any).associate = (models: any) => {
  // User can have many Events
  User.hasMany(models.Event, {
    foreignKey: "createdBy",
    as: "events",
  });
};

export default User;
