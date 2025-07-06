'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verifica se coluna existe antes de remover
    const table = await queryInterface.describeTable('produtos');
    if (table.tipo) {
      await queryInterface.removeColumn('produtos', 'tipo');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('produtos', 'tipo', {
      type: Sequelize.ENUM('fisico', 'digital'),
      defaultValue: 'fisico',
    });
  }
}; 