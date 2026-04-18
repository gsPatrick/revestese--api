const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarrinhoAbandonado = sequelize.define('CarrinhoAbandonado', {
  sessionId: { type: DataTypes.STRING(100) },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  itens: { type: DataTypes.JSON, allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  convertido: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'carrinhos_abandonados',
  timestamps: true,
});

module.exports = CarrinhoAbandonado;
