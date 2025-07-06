const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const ConfiguracaoLoja = sequelize.define(
  "ConfiguracaoLoja",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    chave: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    valor: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.ENUM("texto", "numero", "booleano", "json", "imagem"),
      defaultValue: "texto",
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "configuracoes_loja",
    timestamps: true,
  },
)

module.exports = ConfiguracaoLoja
