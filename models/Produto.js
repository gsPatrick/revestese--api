const { DataTypes, NOW } = require("sequelize")
const { sequelize } = require("../config/database")
// const PlanoAssinatura = require('./PlanoAssinatura'); // Remover import

const Produto = sequelize.define(
  "Produto",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imagens: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categorias',
        key: 'id'
      }
    },
    itensDownload: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: false,
    },
  },
  {
    tableName: "produtos",
    timestamps: true,
    underscored: true,
  },
)

// Remover associação daqui
// Produto.belongsToMany(PlanoAssinatura, {
//   through: 'plano_assinatura_produtos',
//   foreignKey: 'produtoId',
//   as: 'planos',
// });

module.exports = Produto
