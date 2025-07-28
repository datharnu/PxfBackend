module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Ensure UUID extension is available
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 2. Add new UUID column
    await queryInterface.addColumn('users', 'new_id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    });

    // 3. Generate UUIDs for existing rows
    await queryInterface.sequelize.query(`
      UPDATE users SET new_id = uuid_generate_v4()
    `);

    // 4. Drop constraints that reference the old ID
    // (You'll need to check your actual constraints)
    await queryInterface.removeConstraint('users', 'users_pkey');

    // 5. Drop the old ID column
    await queryInterface.removeColumn('users', 'id');

    // 6. Rename new column
    await queryInterface.renameColumn('users', 'new_id', 'id');

    // 7. Add primary key constraint
    await queryInterface.addConstraint('users', {
      fields: ['id'],
      type: 'primary key'
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverse the process if needed
    await queryInterface.addColumn('users', 'old_id', {
      type: Sequelize.INTEGER
    });

    // You'd need to determine how to map UUIDs back to integers
    // This is just a placeholder - actual implementation depends on your needs
    await queryInterface.sequelize.query(`
      UPDATE users SET old_id = EXTRACT(EPOCH FROM created_at)::integer
    `);

    await queryInterface.removeConstraint('users', 'users_pkey');
    await queryInterface.removeColumn('users', 'id');
    await queryInterface.renameColumn('users', 'old_id', 'id');
    await queryInterface.addConstraint('users', {
      fields: ['id'],
      type: 'primary key'
    });
  }
};