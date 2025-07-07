// src/models/produto.js

const { DataTypes, NOW } = require("sequelize")
const { sequelize } = require("../config/database")
const slugify = require('slugify'); // <-- Importar slugify

// const PlanoAssinatura = require('./PlanoAssinatura'); // Remover import

const Produto = sequelize.define(
  "Produto",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // <-- ADICIONADA A COLUNA SLUG AQUI NOVAMENTE
    slug: {
      type: DataTypes.STRING,
      allowNull: true, // Permitir null inicialmente, será gerado
      unique: true,    // Deve ser único
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // <-- PROPRIEDADE IMAGENS MANTIDA COMO JSON
    imagens: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categorias',
        key: 'id'
      }
    },
    // <-- PROPRIEDADE ITENSDOWNLOAD MANTIDA COMO JSON
    itensDownload: {
      type: DataTypes.JSON, // Array de URLs ou paths de arquivos digitais
      allowNull: true,
      defaultValue: [],
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // <-- CAMPOS DE DIMENSÃO MANTIDOS AQUI
    peso: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        defaultValue: 0.300, 
    },
     largura: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 10.00,
    },
     altura: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 10.00,
    },
     comprimento: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 10.00,
    },
     // <-- FLAG DIGITAL MANTIDA AQUI (se você a tinha antes, caso contrário remova)
     // digital: { 
     //    type: DataTypes.BOOLEAN,
     //    defaultValue: false,
     // },
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
    sequelize,
    modelName: "Produto",
    tableName: "produtos",
    timestamps: true,
    underscored: true,
    // <-- HOOKS PARA GERAR SLUG ADICIONADOS
    hooks: {
        beforeCreate: (produto, options) => {
            if (produto.nome && !produto.slug) {
                produto.slug = slugify(produto.nome, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
            }
        },
         beforeUpdate: (produto, options) => {
             if (produto.changed('nome') && !options.fields.includes('slug')) {
                  produto.slug = slugify(produto.nome, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
             } else if (produto.changed('slug') && produto.slug === '') {
                 // Se o slug for definido para vazio, podemos regenerar a partir do nome
                 produto.slug = slugify(produto.nome, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
             }
         }
     }
  },
)

// Remover associação daqui (mantido comentado)
// Produto.belongsToMany(PlanoAssinatura, {
//   through: 'plano_assinatura_produtos',
//   foreignKey: 'produtoId',
//   as: 'planos',
// });

// static associate(models) { ... } <-- REMOVIDO SE NÃO ESTAVA NA VERSÃO ANTERIOR
// Se sua versão anterior do modelo NÃO tinha static associate, remova-o.
// Se tinha static associate MAS as associações eram definidas no index.js, mantenha a função vazia.

module.exports = Produto