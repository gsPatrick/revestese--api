// src/models/produto.js

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Produto extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define associações aqui
      Produto.hasMany(models.ArquivoProduto, {
        as: 'ArquivoProdutos',
        foreignKey: 'produtoId',
        onDelete: 'CASCADE', // Exclui arquivos quando o produto é excluído
        hooks: true // Garante que hooks (como exclusão de arquivos físicos) sejam chamados
      });

      Produto.hasMany(models.Avaliacao, {
        as: 'Avaliacoes',
        foreignKey: 'produtoId',
        onDelete: 'CASCADE'
      });

      // Associação com Categoria (um produto pertence a uma categoria)
      Produto.belongsTo(models.Categoria, {
        as: 'categoria', // Alias para a associação
        foreignKey: 'categoriaId',
      });

      // Associação N:M com Pedido através da tabela ItemPedido
       Produto.belongsToMany(models.Pedido, {
         through: models.ItemPedido,
         foreignKey: 'produtoId',
         as: 'pedidos'
       });

       // Associação com Variações do Produto
       Produto.hasMany(models.VariacaoProduto, {
         as: 'variacoes',
         foreignKey: 'produtoId',
         onDelete: 'CASCADE',
         hooks: true,
       });

    }
  }
  Produto.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Nome do produto deve ser único
    },
    slug: { // <-- ADICIONADA A COLUNA SLUG AQUI
      type: DataTypes.STRING,
      allowNull: true, // Pode ser gerado automaticamente, então permitimos null inicialmente
      unique: true, // Slugs devem ser únicos
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Preço e estoque base removidos, pois a gestão será via VariaçãoProduto
    // preco: {
    //   type: DataTypes.DECIMAL(10, 2),
    //   allowNull: false,
    //   defaultValue: 0.00,
    // },
    // estoque: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    //   defaultValue: 0,
    // },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Permitir produtos sem categoria inicialmente
      references: {
        model: 'Categorias', // Nome da tabela referenciada
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Se a categoria for excluída, define categoriaId para NULL
    },
    // Adicionar campos de peso/dimensões para cálculo de frete (mover para VariaçãoProduto idealmente)
    peso: {
        type: DataTypes.DECIMAL(10, 3), // Peso em kg
        allowNull: true,
        defaultValue: 0.3, // Peso padrão razoável para livro
    },
     largura: {
        type: DataTypes.DECIMAL(10, 2), // Largura em cm
        allowNull: true,
        defaultValue: 10, // Largura padrão
    },
     altura: {
        type: DataTypes.DECIMAL(10, 2), // Altura em cm
        allowNull: true,
        defaultValue: 10, // Altura padrão
    },
     comprimento: {
        type: DataTypes.DECIMAL(10, 2), // Comprimento em cm
        allowNull: true,
        defaultValue: 10, // Comprimento padrão
    },
    // Remoção da flag digital, agora na variação
    // digital: {
    //   type: DataTypes.BOOLEAN,
    //   allowNull: false,
    //   defaultValue: false,
    // },
    // Remoção de itensDownload, gerenciado via ArquivoProduto
    // itensDownload: {
    //   type: DataTypes.JSON, // Array de URLs ou paths de arquivos digitais
    //   allowNull: true,
    // },
  }, {
    sequelize,
    modelName: 'Produto',
     tableName: 'produtos', // Nome da tabela no banco
     timestamps: true, // Habilita createdAt e updatedAt
     paranoid: true, // Habilita soft delete (deletedAt)

     // Adiciona um hook beforeCreate para gerar o slug automaticamente
     hooks: {
        beforeCreate: (produto, options) => {
            if (!produto.slug && produto.nome) {
                produto.slug = produto.nome
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
            }
        },
         beforeUpdate: (produto, options) => {
             // Regenerar slug se o nome mudar e o slug não for definido manualmente
             if (produto.changed('nome') && !produto.slug) {
                  produto.slug = produto.nome
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
             }
         }
     }
  });
  return Produto;
};