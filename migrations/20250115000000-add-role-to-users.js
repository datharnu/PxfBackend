"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add role column to users table
        await queryInterface.addColumn("users", "role", {
            type: Sequelize.ENUM("user", "admin", "superadmin"),
            allowNull: true,
            defaultValue: "user",
        });

        // Update existing users to have 'user' role
        await queryInterface.sequelize.query(
            'UPDATE users SET role = \'user\' WHERE role IS NULL;'
        );
    },

    async down(queryInterface, Sequelize) {
        // Remove role column
        await queryInterface.removeColumn("users", "role");

        // Drop the enum type
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
    }
};
