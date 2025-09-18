'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('face_detections', 'frameTimestamp', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'For video frames - timestamp in seconds'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('face_detections', 'frameTimestamp');
  }
};
