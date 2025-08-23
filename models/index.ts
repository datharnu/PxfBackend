// import fs from "fs";
// import path from "path";
// import { Sequelize, DataTypes } from "sequelize";
// import { config as dotenvConfig } from "dotenv";

// dotenvConfig(); // Load .env

// const basename = path.basename(__filename);
// const env = process.env.NODE_ENV || "development";

// const configPath = path.resolve(__dirname, "../config/config.json");
// // eslint-disable-next-line @typescript-eslint/no-require-imports
// const config = require(configPath)[env];

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// const db: any = {};

// let sequelize: Sequelize;

// if (config.use_env_variable) {
//   sequelize = new Sequelize(
//     process.env[config.use_env_variable] as string,
//     config
//   );
// } else {
//   sequelize = new Sequelize(
//     config.database,
//     config.username,
//     config.password,
//     config
//   );
// }

// // Read all model files
// fs.readdirSync(__dirname)
//   .filter((file) => {
//     return (
//       file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
//     );
//   })
//   .forEach((file) => {
//     const model = require(path.join(__dirname, file))(sequelize, DataTypes);
//     db[model.name] = model;
//   });

// // Apply associations
// Object.keys(db).forEach((modelName) => {
//   if (db[modelName].associate) {
//     db[modelName].associate(db);
//   }
// });

// db.sequelize = sequelize;
// db.Sequelize = Sequelize;

// export default db;

// models/index.ts - Updated to use environment variables
import fs from "fs";
import path from "path";
import { Sequelize, DataTypes } from "sequelize";
import { config as dotenvConfig } from "dotenv";

// Import your models directly
import User from "./user";
import Event from "./event";

dotenvConfig(); // Load .env

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = {};

let sequelize: Sequelize;

// Use environment variables for database configuration
const databaseConfig = {
  database: process.env.DB_NAME || process.env.DATABASE_NAME,
  username: process.env.DB_USER || process.env.DATABASE_USER,
  password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD,
  host: process.env.DB_HOST || process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || "5432"),
  dialect: (process.env.DB_DIALECT || "postgres") as
    | "postgres"
    | "mysql"
    | "sqlite"
    | "mariadb",
  logging: env === "development" ? console.log : false,
  dialectOptions:
    env === "production"
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
};

// Check if using a connection string (common in production)
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: databaseConfig.dialect,
    logging: databaseConfig.logging,
    dialectOptions: databaseConfig.dialectOptions,
  });
} else {
  // Use individual connection parameters
  sequelize = new Sequelize(
    databaseConfig.database!,
    databaseConfig.username!,
    databaseConfig.password!,
    {
      host: databaseConfig.host,
      port: databaseConfig.port,
      dialect: databaseConfig.dialect,
      logging: databaseConfig.logging,
      dialectOptions: databaseConfig.dialectOptions,
    }
  );
}

// Add models to db object
db.User = User;
db.Event = Event;

// Apply associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
export { User, Event, sequelize };
