"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn("events", "eventSlug", {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
        });
    },

    async down(queryInterface, Sequelize) {
        // Revert to NOT NULL; this will fail if nulls exist, so ensure data is fixed before down
        await queryInterface.changeColumn("events", "eventSlug", {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        });
    },
};


