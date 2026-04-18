const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Acesso = sequelize.define('Acesso', {
  tipo: {
    type: DataTypes.STRING(50),
    allowNull: false, // 'home','catalogo','produto','contato','sobre','carrinho','checkout'
  },
  url: { type: DataTypes.STRING(500) },
  produtoId: { type: DataTypes.INTEGER, allowNull: true },
  sessionId: { type: DataTypes.STRING(100) },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  referrer: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'acessos',
  timestamps: true,
  updatedAt: false,
});

module.exports = Acesso;
