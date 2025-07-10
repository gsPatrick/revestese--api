'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
      uso_maximo: { // Coluna em snake_case para consistência
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      uso_atual: { // Coluna em snake_case
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      // --- COLUNAS DE REGRAS ADICIONADAS DIRETAMENTE AQUI ---
      tipo_regra: { // Coluna em snake_case
        type: Sequelize.ENUM('geral', 'primeira_compra', 'valor_minimo_pedido', 'quantidade_minima_produtos', 'social_media'),
        defaultValue: 'geral',
        allowNull: false,
        comment: "Tipo de regra de aplicação do cupom"
      },
      valor_minimo_pedido: { // Coluna em snake_case
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Valor mínimo do pedido para que o cupom seja aplicável"
      },
      quantidade_minima_produtos: { // Coluna em snake_case
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Quantidade mínima de produtos no carrinho para que o cupom seja aplicável"
      },
      invisivel: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: "Se true, o cupom não deve ser listado em páginas públicas"
      },
      is_principal: { // Coluna em snake_case
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: "Se true, este é o cupom principal a ser exibido em pop-ups"
      },
      // --- FIM DAS COLUNAS DE REGRAS ---
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cupons');
  }
};