const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HistoricoEstoque = sequelize.define(
  'HistoricoEstoque',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    produtoId:   { type: DataTypes.INTEGER, allowNull: false },
    variacaoId:  { type: DataTypes.INTEGER, allowNull: true },
    adminId:     { type: DataTypes.INTEGER, allowNull: true },
    delta:       { type: DataTypes.INTEGER, allowNull: false },        // +N ou -N
    estoqueAntes:{ type: DataTypes.INTEGER, allowNull: false },
    estoqueDepois:{ type: DataTypes.INTEGER, allowNull: false },
    tipo: {
      type: DataTypes.ENUM('entrada', 'saida', 'ajuste'),
      defaultValue: 'ajuste',
    },
    observacao:  { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'historico_estoque',
    timestamps: true,
  }
);

module.exports = HistoricoEstoque;
