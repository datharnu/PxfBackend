"use strict";

import { DataTypes } from "sequelize";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("face_detections", {
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
            mediaId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "event_media",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            faceId: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            persistedFaceId: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            faceRectangle: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
            faceAttributes: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            confidence: {
                type: DataTypes.FLOAT,
                allowNull: false,
            },
            isIdentified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            identifiedUserId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: "users",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
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
        await queryInterface.addIndex("face_detections", ["userId"]);
        await queryInterface.addIndex("face_detections", ["eventId"]);
        await queryInterface.addIndex("face_detections", ["mediaId"]);
        await queryInterface.addIndex("face_detections", ["faceId"]);
        await queryInterface.addIndex("face_detections", ["persistedFaceId"]);
        await queryInterface.addIndex("face_detections", ["isIdentified"]);
        await queryInterface.addIndex("face_detections", ["identifiedUserId"]);
        await queryInterface.addIndex("face_detections", ["isActive"]);
        await queryInterface.addIndex("face_detections", ["createdAt"]);

        // Composite indexes
        await queryInterface.addIndex("face_detections", ["eventId", "isActive"]);
        await queryInterface.addIndex("face_detections", ["userId", "eventId"]);
        await queryInterface.addIndex("face_detections", ["mediaId", "isActive"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("face_detections");
    }
};
