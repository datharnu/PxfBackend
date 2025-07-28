'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'verificationCode', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('users', 'verificationCodeExpires', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('users', 'lastPasswordResetRequest', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('users', 'tokenVersion', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'verificationCode');
    await queryInterface.removeColumn('users', 'verificationCodeExpires');
    await queryInterface.removeColumn('users', 'lastPasswordResetRequest');
    await queryInterface.removeColumn('users', 'tokenVersion');
  }
};