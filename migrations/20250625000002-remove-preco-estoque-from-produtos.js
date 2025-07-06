'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('produtos');
    if (table.preco) {
      await queryInterface.removeColumn('produtos', 'preco');
    }
    if (table.estoque) {
      await queryInterface.removeColumn('produtos', 'estoque');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('produtos', 'preco', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    });
    await queryInterface.addColumn('produtos', 'estoque', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
  }
}; 