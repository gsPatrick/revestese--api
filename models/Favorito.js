const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Favorito = sequelize.define(
  "Favorito",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    produtoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "produtos",
        key: "id",
      },
    },
  },
  {
    tableName: "favoritos",
    timestamps: true,
  },
)

module.exports = Favorito
