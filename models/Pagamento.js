const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Pagamento = sequelize.define(
  "Pagamento",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    pedidoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "pedidos",
        key: "id",
      },
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    metodo: {
      type: DataTypes.ENUM("cartao", "pix", "boleto", "mercado_pago"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pendente", "aprovado", "rejeitado", "cancelado"),
      defaultValue: "pendente",
    },
    transacaoId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dadosTransacao: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "pagamentos",
    timestamps: true,
  },
)

module.exports = Pagamento
