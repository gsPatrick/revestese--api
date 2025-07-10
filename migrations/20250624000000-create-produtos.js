'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('produtos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nome: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      imagens: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      categoria_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categorias',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      itens_download: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      peso: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        defaultValue: 0.300
      },
      largura: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 10.00
      },
      altura: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 10.00
      },
      comprimento: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 10.00
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('produtos');
  }
};
