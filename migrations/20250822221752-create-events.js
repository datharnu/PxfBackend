"use strict";

import { DataTypes } from "sequelize";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("events", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      eventFlyer: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      guestLimit: {
        type: DataTypes.ENUM("10", "100", "250", "500", "800", "1000+"),
        allowNull: false,
      },
      photoCapLimit: {
        type: DataTypes.ENUM("5", "10", "15", "20", "25"),
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      eventDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      eventSlug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      qrCodeData: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      accessPassword: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isPasswordProtected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add indexes (optional but matches your model)
    await queryInterface.addIndex("events", ["createdBy"]);
    await queryInterface.addIndex("events", ["isActive"]);
    await queryInterface.addIndex("events", ["eventDate"]);
    await queryInterface.addIndex("events", ["guestLimit"]);
    await queryInterface.addIndex("events", ["photoCapLimit"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("events");
  },
};
