"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      fullname: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true, // null allowed for Google users
      },
      googleId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      verificationCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      verificationCodeExpires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastPasswordResetRequest: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      tokenVersion: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // Indexes (matches your model)
    await queryInterface.addIndex("users", ["email"], { unique: true });
    await queryInterface.addIndex("users", ["googleId"], {
      unique: true,
      where: {
        googleId: {
          [Sequelize.Op.ne]: null,
        },
      },
    });
    await queryInterface.addIndex("users", ["verificationCodeExpires"]);
    await queryInterface.addIndex("users", ["lastPasswordResetRequest"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
