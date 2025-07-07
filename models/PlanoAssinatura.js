// src/models/PlanoAssinatura.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
// const Produto = require('./Produto'); // Remover import se não for usado
// const AssinaturaUsuario = require('./AssinaturaUsuario'); // Remover import se não for usado

const PlanoAssinatura = sequelize.define(
  'PlanoAssinatura',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // O campo planoId parece ser redundante aqui, já que o próprio modelo TEM um ID
    // A foreign key 'planoId' em AssinaturaUsuario aponta para o ID deste modelo.
    // A menos que este campo 'planoId' tenha outro propósito específico (ex: ID de um plano externo),
    // ele pode ser removido. Vou mantê-lo por enquanto, mas é algo a revisar.
    planoId: { // <-- Possível campo redundante?
      type: DataTypes.UUID,
       allowNull: true // Manter allowNull true conforme seu código
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    frequencia: {
      type: DataTypes.ENUM('mensal', 'trimestral', 'anual'),
      allowNull: false,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    mercadoPagoPlanId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'planos_assinatura',
    timestamps: true,
  },
)

// REMOVIDAS AS ASSOCIAÇÕES DAQUI:
// PlanoAssinatura.belongsToMany(Produto, { ... });
// A associação com AssinaturaUsuario será adicionada em index.js

module.exports = PlanoAssinatura;