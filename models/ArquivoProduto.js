const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const ArquivoProduto = sequelize.define(
  "ArquivoProduto",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    produtoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "produtos",
        key: "id",
      },
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "imagem", // 'imagem', 'arquivo' ou 'video'
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tamanho: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadados: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    principal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ordem: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
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
    tableName: "arquivos_produto",
    timestamps: true,
    underscored: true,
  },
)

module.exports = ArquivoProduto
