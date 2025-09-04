"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();

        // Extend enums to include '1000' and 'CUSTOM' without removing existing values like '1000+'
        if (dialect === "postgres") {
            // Add new enum values if not already present
            await queryInterface.sequelize.query(
                "ALTER TYPE \"enum_events_guestLimit\" ADD VALUE IF NOT EXISTS '1000';"
            );
            await queryInterface.sequelize.query(
                "ALTER TYPE \"enum_events_guestLimit\" ADD VALUE IF NOT EXISTS 'CUSTOM';"
            );

            await queryInterface.sequelize.query(
                "ALTER TYPE \"enum_events_photoCapLimit\" ADD VALUE IF NOT EXISTS 'CUSTOM';"
            );
        } else {
            // For non-Postgres dialects, changeColumn with extended ENUM definitions
            await queryInterface.changeColumn("events", "guestLimit", {
                type: Sequelize.ENUM("10", "100", "250", "500", "800", "1000", "CUSTOM", "1000+"),
                allowNull: false,
            });
            await queryInterface.changeColumn("events", "photoCapLimit", {
                type: Sequelize.ENUM("5", "10", "15", "20", "25", "CUSTOM"),
                allowNull: false,
            });
        }

        // Add custom columns
        await queryInterface.addColumn("events", "customGuestLimit", {
            type: Sequelize.INTEGER,
            allowNull: true,
        });

        await queryInterface.addColumn("events", "customPhotoCapLimit", {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove custom columns
        await queryInterface.removeColumn("events", "customGuestLimit");
        await queryInterface.removeColumn("events", "customPhotoCapLimit");

        // Note: Rolling back enum value additions in Postgres is non-trivial and generally avoided.
        // We will leave the extended enum values in place.

        const dialect = queryInterface.sequelize.getDialect();
        if (dialect !== "postgres") {
            // For non-Postgres, attempt to revert to original definitions (will still include added values in data)
            await queryInterface.changeColumn("events", "guestLimit", {
                type: Sequelize.ENUM("10", "100", "250", "500", "800", "1000+"),
                allowNull: false,
            });
            await queryInterface.changeColumn("events", "photoCapLimit", {
                type: Sequelize.ENUM("5", "10", "15", "20", "25"),
                allowNull: false,
            });
        }
    },
};


