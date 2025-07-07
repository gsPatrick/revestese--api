// src/models/PlanoAssinaturaProduto.js

const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
// const PlanoAssinatura = require("./PlanoAssinatura") // Remover import se não for usado
// const Produto = require("./Produto") // Remover import se não for usado

const PlanoAssinaturaProduto = sequelize.define(
  "PlanoAssinaturaProduto",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // foreign keys 'planoId' e 'produtoId' serão definidas automaticamente pelo Sequelize
    // quando a associação belongsToMany for definida em index.js
  },
  {
    tableName: "plano_assinatura_produtos",
    timestamps: true,
  },
)

// REMOVIDAS AS ASSOCIAÇÕES DAQUI:
// PlanoAssinaturaProduto.belongsTo(PlanoAssinatura, { foreignKey: 'planoId', as: 'plano' })
// PlanoAssinaturaProduto.belongsTo(Produto, { foreignKey: 'produtoId', as: 'produto' })

module.exports = PlanoAssinaturaProduto;