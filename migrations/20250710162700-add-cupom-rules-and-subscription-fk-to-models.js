// src/database/migrations/20250710162700-add-cupom-rules-and-subscription-fk-to-models.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Adicionar novas colunas na tabela 'cupons'
    await queryInterface.addColumn('cupons', 'tipoRegra', {
      type: Sequelize.ENUM('geral', 'primeira_compra', 'valor_minimo_pedido', 'quantidade_minima_produtos', 'social_media'),
      defaultValue: 'geral',
      allowNull: false,
      comment: "Tipo de regra de aplicação do cupom"
    });
    await queryInterface.addColumn('cupons', 'valorMinimoPedido', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: "Valor mínimo do pedido para que o cupom seja aplicável"
    });
    await queryInterface.addColumn('cupons', 'quantidadeMinimaProdutos', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Quantidade mínima de produtos no carrinho para que o cupom seja aplicável"
    });
    await queryInterface.addColumn('cupons', 'invisivel', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "Se true, o cupom não deve ser listado em páginas públicas"
    });
    await queryInterface.addColumn('cupons', 'isPrincipal', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "Se true, este é o cupom principal a ser exibido em pop-ups"
    });

    // 2. Adicionar coluna 'cupomAplicadoId' na tabela 'pedidos'
    await queryInterface.addColumn('pedidos', 'cupomAplicadoId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Permitir nulo, pois nem todo pedido terá cupom
      references: {
        model: 'cupons', // Nome da tabela referenciada
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Se o cupom for excluído, o ID no pedido é setado para NULL
    });

    // A seção de alteração de chaves estrangeiras de 'assinaturas_usuario' foi removida.
  },

  down: async (queryInterface, Sequelize) => {
    // Ordem de reversão: Remover colunas que são FKs primeiro, depois as colunas referenciadas.

    // 1. Remover coluna 'cupomAplicadoId' da tabela 'pedidos'
    await queryInterface.removeColumn('pedidos', 'cupomAplicadoId');

    // 2. Remover colunas da tabela 'cupons'
    await queryInterface.removeColumn('cupons', 'isPrincipal');
    await queryInterface.removeColumn('cupons', 'invisivel');
    await queryInterface.removeColumn('cupons', 'quantidadeMinimaProdutos');
    await queryInterface.removeColumn('cupons', 'valorMinimoPedido');
    await queryInterface.removeColumn('cupons', 'tipoRegra');

    // A seção de reversão de chaves estrangeiras de 'assinaturas_usuario' foi removida.
  }
};