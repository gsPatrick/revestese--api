// src/models/Cupom.js

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
    // --- NOVOS CAMPOS PARA REGRAS E POP-UP ---
    tipoRegra: {
      type: DataTypes.ENUM("geral", "primeira_compra", "valor_minimo_pedido", "quantidade_minima_produtos", "social_media"),
      defaultValue: "geral",
      allowNull: false,
      comment: "Tipo de regra de aplicação do cupom (ex: primeira compra, valor mínimo, etc.)"
    },
    valorMinimoPedido: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // Só é obrigatório se tipoRegra for 'valor_minimo_pedido'
      comment: "Valor mínimo do pedido para que o cupom seja aplicável"
    },
    quantidadeMinimaProdutos: {
      type: DataTypes.INTEGER,
      allowNull: true, // Só é obrigatório se tipoRegra for 'quantidade_minima_produtos'
      comment: "Quantidade mínima de produtos no carrinho para que o cupom seja aplicável"
    },
    invisivel: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "Se true, o cupom não deve ser listado em páginas públicas (ex: cupons de social media)"
    },
    isPrincipal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      unique: true, // Apenas um cupom pode ser principal por vez
      comment: "Se true, este é o cupom principal a ser exibido em pop-ups"
    },
    // --- FIM DOS NOVOS CAMPOS ---
  },
  {
    tableName: "cupons",
    timestamps: true,
    hooks: {
      // Garante que apenas um cupom seja principal por vez
      beforeSave: async (cupom, options) => {
        if (cupom.isPrincipal && cupom.changed('isPrincipal')) {
          await Cupom.update(
            { isPrincipal: false },
            { 
              where: { isPrincipal: true, id: { [require('sequelize').Op.ne]: cupom.id } },
              transaction: options.transaction // Garante que a operação seja atômica
            }
          );
        }
      },
    }
  },
)

module.exports = Cupom