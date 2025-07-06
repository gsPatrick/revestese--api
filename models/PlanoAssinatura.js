const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
// const Produto = require('./Produto'); // Remover import

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
    planoId: {
      type: DataTypes.UUID
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

// Remover associação daqui
// PlanoAssinatura.belongsToMany(Produto, {
//   through: 'plano_assinatura_produtos',
//   foreignKey: 'planoId',
//   as: 'produtos',
// });

// A associação com AssinaturaUsuario será adicionada depois que o modelo for criado.

module.exports = PlanoAssinatura;