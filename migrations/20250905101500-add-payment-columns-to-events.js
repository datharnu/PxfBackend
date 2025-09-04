"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();

        // Create ENUM type for paymentStatus in Postgres if needed
        if (dialect === "postgres") {
            await queryInterface.sequelize.query(
                "DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_events_paymentStatus') THEN\n    CREATE TYPE \"enum_events_paymentStatus\" AS ENUM ('FREE', 'PENDING', 'PAID');\n  END IF;\nEND$$;"
            );
        }

        // Add paymentStatus
        await queryInterface.addColumn("events", "paymentStatus", {
            type:
                dialect === "postgres"
                    ? Sequelize.ENUM("FREE", "PENDING", "PAID")
                    : Sequelize.ENUM("FREE", "PENDING", "PAID"),
            allowNull: false,
            defaultValue: "FREE",
        });

        // Add planPrice
        await queryInterface.addColumn("events", "planPrice", {
            type: Sequelize.INTEGER,
            allowNull: true,
        });

        // Add paystackReference
        await queryInterface.addColumn("events", "paystackReference", {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
        });
        // Unique constraint on paystackReference allows multiple NULLs by default in Postgres

        // Add paidAt
        await queryInterface.addColumn("events", "paidAt", {
            type: Sequelize.DATE,
            allowNull: true,
        });

        // Optional: normalize any legacy guestLimit value '1000+' to '1000' if present
        try {
            await queryInterface.sequelize.query(
                "UPDATE \"events\" SET \"guestLimit\" = '1000' WHERE \"guestLimit\" = '1000+';"
            );
        } catch (e) {
            // ignore if column/type does not allow the assignment yet
        }
    },

    async down(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();

        // Remove columns
        await queryInterface.removeColumn("events", "paidAt");
        await queryInterface.removeColumn("events", "paystackReference");
        await queryInterface.removeColumn("events", "planPrice");

        // For ENUM removal in Postgres, must drop column before dropping type
        await queryInterface.removeColumn("events", "paymentStatus");
        if (dialect === "postgres") {
            // Drop the ENUM type if exists
            await queryInterface.sequelize.query(
                "DO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_events_paymentStatus') THEN\n    DROP TYPE \"enum_events_paymentStatus\";\n  END IF;\nEND$$;"
            );
        }
    },
};


