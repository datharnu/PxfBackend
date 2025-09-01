'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('event_media', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            eventId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'events',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            uploadedBy: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            mediaType: {
                type: Sequelize.ENUM('image', 'video'),
                allowNull: false
            },
            mediaUrl: {
                type: Sequelize.STRING,
                allowNull: false
            },
            fileName: {
                type: Sequelize.STRING,
                allowNull: false
            },
            fileSize: {
                type: Sequelize.BIGINT,
                allowNull: false
            },
            mimeType: {
                type: Sequelize.STRING,
                allowNull: false
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        // Add indexes
        await queryInterface.addIndex('event_media', ['eventId']);
        await queryInterface.addIndex('event_media', ['uploadedBy']);
        await queryInterface.addIndex('event_media', ['mediaType']);
        await queryInterface.addIndex('event_media', ['isActive']);
        await queryInterface.addIndex('event_media', ['createdAt']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('event_media');

        // Drop the enum type
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_event_media_mediaType";');
    }
};

