'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('event_media', 'is_face_enrollment', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Flag to indicate if this media is used for face enrollment'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('event_media', 'is_face_enrollment');
  }
};