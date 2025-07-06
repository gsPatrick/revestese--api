const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Frete = sequelize.define(
  "Frete",
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
    codigoRastreio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    servico: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    prazoEntrega: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    etiquetaUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    statusEntrega: {
      type: DataTypes.ENUM("pendente", "coletado", "em_transito", "entregue", "devolvido"),
      defaultValue: "pendente",
    },
  },
  {
    tableName: "fretes",
    timestamps: true,
  },
)

module.exports = Frete
