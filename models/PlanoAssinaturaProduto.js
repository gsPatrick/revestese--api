const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const PlanoAssinatura = require("./PlanoAssinatura")
const Produto = require("./Produto")

const PlanoAssinaturaProduto = sequelize.define(
  "PlanoAssinaturaProduto",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
  },
  {
    tableName: "plano_assinatura_produtos",
    timestamps: true,
  },
)

PlanoAssinaturaProduto.belongsTo(PlanoAssinatura, { foreignKey: 'planoId', as: 'plano' })
PlanoAssinaturaProduto.belongsTo(Produto, { foreignKey: 'produtoId', as: 'produto' })

module.exports = PlanoAssinaturaProduto