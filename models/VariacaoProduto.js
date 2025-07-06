const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

/**
 * Modelo de Variação de Produto.
 * Cada variação pertence a um produto e pode ter preço, valor adicional,
 * indicar se é digital (não possui frete) e controle de estoque próprio.
 */
const VariacaoProduto = sequelize.define(
  "VariacaoProduto",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    produtoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "produtos",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    digital: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    estoque: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    tableName: "variacoes_produto",
    timestamps: true,
    underscored: true,
  },
)

module.exports = VariacaoProduto
