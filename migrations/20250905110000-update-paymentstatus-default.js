"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();

        // Ensure ENUM type exists (created in earlier migration), then set default to PENDING
        if (dialect === "postgres") {
            await queryInterface.sequelize.query(
                "ALTER TABLE \"events\" ALTER COLUMN \"paymentStatus\" SET DEFAULT 'PENDING';"
            );

            // Set PENDING for any non-free plan rows
            await queryInterface.sequelize.query(
                "UPDATE \"events\" SET \"paymentStatus\"='PENDING', \"planPrice\"=NULL, \"paidAt\"=NULL WHERE NOT (\"guestLimit\"='10' AND \"photoCapLimit\"='5');"
            );
        } else {
            await queryInterface.changeColumn("events", "paymentStatus", {
                type: Sequelize.ENUM("FREE", "PENDING", "PAID"),
                allowNull: false,
                defaultValue: "PENDING",
            });
            // Non-Postgres update
            await queryInterface.sequelize.query(
                "UPDATE events SET paymentStatus='PENDING', planPrice=NULL, paidAt=NULL WHERE NOT (guestLimit='10' AND photoCapLimit='5');"
            );
        }
    },

    async down(queryInterface, Sequelize) {
        const dialect = queryInterface.sequelize.getDialect();
        if (dialect === "postgres") {
            await queryInterface.sequelize.query(
                "ALTER TABLE \"events\" ALTER COLUMN \"paymentStatus\" SET DEFAULT 'FREE';"
            );
        } else {
            await queryInterface.changeColumn("events", "paymentStatus", {
                type: Sequelize.ENUM("FREE", "PENDING", "PAID"),
                allowNull: false,
                defaultValue: "FREE",
            });
        }
    },
};


