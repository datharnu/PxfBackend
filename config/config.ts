// import dotenv from "dotenv";
// import { Dialect } from "sequelize";

// // Load .env file
// dotenv.config();

// // Helper function to safely get env variables
// const getEnvVar = (key: string): string => {
//   const value = process.env[key];
//   if (!value) {
//     throw new Error(`❌ Environment variable ${key} is missing`);
//   }
//   return value;
// };

// interface IConfig {
//   username: string;
//   password: string;
//   database: string;
//   host: string;
//   dialect: Dialect;
//   logging: boolean;
// }

// interface IDbConfig {
//   development: IConfig;
//   test: IConfig;
//   production: IConfig;
// }

// // Construct config safely
// const dbConfig: IDbConfig = {
//   development: {
//     username: getEnvVar("DB_USER"),
//     password: getEnvVar("DB_PASSWORD"),
//     database: getEnvVar("DB_NAME"),
//     host: getEnvVar("DB_HOST"),
//     dialect: "postgres",
//     logging: false,
//   },
//   test: {
//     username: getEnvVar("DB_USER"),
//     password: getEnvVar("DB_PASSWORD"),
//     database: getEnvVar("DB_NAME"),
//     host: getEnvVar("DB_HOST"),
//     dialect: "postgres",
//     logging: false,
//   },
//   production: {
//     username: getEnvVar("DB_USER"),
//     password: getEnvVar("DB_PASSWORD"),
//     database: getEnvVar("DB_NAME"),
//     host: getEnvVar("DB_HOST"),
//     dialect: "postgres",
//     logging: false,
//   },
// };

// export default dbConfig;

import dotenv from "dotenv";
import { Dialect } from "sequelize";

// Load .env file
dotenv.config();

// Helper function to safely get env variables
const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Environment variable ${key} is missing`);
  }
  return value;
};

interface IConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  dialect: Dialect;
  logging: boolean;
  dialectOptions?: {
    ssl?: {
      require: boolean;
      rejectUnauthorized: boolean;
    };
  };
}

interface IDbConfig {
  development: IConfig;
  test: IConfig;
  production: IConfig;
}

// SSL configuration for PostgreSQL
const sslConfig = {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
};

// Construct config safely
const dbConfig: IDbConfig = {
  development: {
    username: getEnvVar("DB_USER"),
    password: getEnvVar("DB_PASSWORD"),
    database: getEnvVar("DB_NAME"),
    host: getEnvVar("DB_HOST"),
    dialect: "postgres",
    logging: false,
    dialectOptions: sslConfig,
  },
  test: {
    username: getEnvVar("DB_USER"),
    password: getEnvVar("DB_PASSWORD"),
    database: getEnvVar("DB_NAME"),
    host: getEnvVar("DB_HOST"),
    dialect: "postgres",
    logging: false,
    dialectOptions: sslConfig,
  },
  production: {
    username: getEnvVar("DB_USER"),
    password: getEnvVar("DB_PASSWORD"),
    database: getEnvVar("DB_NAME"),
    host: getEnvVar("DB_HOST"),
    dialect: "postgres",
    logging: false,
    dialectOptions: sslConfig,
  },
};

export default dbConfig;
