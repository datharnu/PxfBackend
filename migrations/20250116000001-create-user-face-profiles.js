"use strict";

import { DataTypes } from "sequelize";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("user_face_profiles", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            eventId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "events",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            persistedFaceId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            faceId: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            enrollmentMediaId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "event_media",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            faceRectangle: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
            faceAttributes: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            enrollmentConfidence: {
                type: DataTypes.FLOAT,
                allowNull: false,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
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

        // Add indexes
        await queryInterface.addIndex("user_face_profiles", ["userId"]);
        await queryInterface.addIndex("user_face_profiles", ["eventId"]);
        await queryInterface.addIndex("user_face_profiles", ["persistedFaceId"], { unique: true });
        await queryInterface.addIndex("user_face_profiles", ["faceId"]);
        await queryInterface.addIndex("user_face_profiles", ["enrollmentMediaId"]);
        await queryInterface.addIndex("user_face_profiles", ["isActive"]);
        await queryInterface.addIndex("user_face_profiles", ["createdAt"]);

        // Composite indexes
        await queryInterface.addIndex("user_face_profiles", ["userId", "eventId"], { unique: true });
        await queryInterface.addIndex("user_face_profiles", ["eventId", "isActive"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("user_face_profiles");
    }
};
