module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("EventMedia", "cloudinary_public_id", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("EventMedia", "cloudinary_public_id");
  },
};
