'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. As colunas de 'cupons' foram movidas para a migração de criação.
    //    Portanto, a seção que adicionava colunas aqui foi removida.

    // 2. Adicionar coluna 'cupomAplicadoId' na tabela 'pedidos'
    //    Esta é a única ação que esta migração precisa fazer agora.
    await queryInterface.addColumn('pedidos', 'cupom_aplicado_id', { // Usando snake_case
      type: Sequelize.INTEGER,
      allowNull: true, // Permitir nulo, pois nem todo pedido terá cupom
      references: {
        model: 'cupons', // Nome da tabela referenciada
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Se o cupom for excluído, o ID no pedido é setado para NULL
    });
  },

  down: async (queryInterface, Sequelize) => {
    // A ordem de reversão é a inversa da de 'up'.
    
    // 1. Remover coluna 'cupomAplicadoId' da tabela 'pedidos'
    await queryInterface.removeColumn('pedidos', 'cupom_aplicado_id'); // Usando snake_case

    // 2. A reversão das colunas de 'cupons' foi removida, pois a ação 'up' correspondente também foi.
  }
};