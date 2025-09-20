'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('event_media', 's3_key', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'S3 object key for the uploaded file',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('event_media', 's3_key');
    }
};
