const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Cupom = sequelize.define(
  "Cupom",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    tipo: {
      type: DataTypes.ENUM("percentual", "fixo"),
      defaultValue: "percentual",
    },
    validade: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usoMaximo: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    usoAtual: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "cupons",
    timestamps: true,
  },
)

module.exports = Cupom
