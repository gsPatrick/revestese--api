'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('cupons', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      codigo: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('percentual', 'fixo'),
        defaultValue: 'percentual'
      },
      validade: {
        type: Sequelize.DATE,
        allowNull: false
      },
      uso_maximo: { // Note: snake_case for column names in migrations is a good practice
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      uso_atual: { // Note: snake_case
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('cupons');
  }
};