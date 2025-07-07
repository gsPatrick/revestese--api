// src/models/produto.js

'use strict';
const {
  Model, DataTypes
} = require('sequelize');
const slugify = require('slugify'); // Importar slugify

module.exports = (sequelize, DataTypes) => {
  class Produto extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Associações com ArquivoProduto (para imagens, arquivos digitais, videos)
      Produto.hasMany(models.ArquivoProduto, {
        as: 'ArquivoProdutos', // Alias para a associação
        foreignKey: 'produtoId',
        onDelete: 'CASCADE',
        hooks: true, // Garante que hooks (como exclusão de arquivos físicos) sejam chamados
      });

      // Associações com Avaliação
      Produto.hasMany(models.Avaliacao, {
        as: 'Avaliacoes',
        foreignKey: 'produtoId',
        onDelete: 'CASCADE',
      });

      // Associação com Categoria (um produto pertence a uma categoria)
      Produto.belongsTo(models.Categoria, {
        as: 'categoria',
        foreignKey: 'categoriaId',
      });

      // Associação N:M com Pedido através da tabela ItemPedido
      Produto.belongsToMany(models.Pedido, {
        through: models.ItemPedido,
        foreignKey: 'produtoId',
        as: 'pedidos',
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
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // COLUNA SLUG: Adicionada conforme necessário para links e buscas amigáveis
    slug: { 
      type: DataTypes.STRING,
      allowNull: true, // Pode ser null se o nome ainda não foi definido ou se preferir gerar depois
      unique: true,    // Garante que slugs sejam únicos
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // REMOVIDO: 'imagens' - Gerenciado via associação ArquivoProduto
    // REMOVIDO: 'itensDownload' - Gerenciado via associação ArquivoProduto
    // REMOVIDO: 'preco' e 'estoque' - Gerenciado via associação VariacaoProduto

    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categorias', // Nome da tabela referenciada
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Se a categoria for excluída, define categoriaId para NULL
    },
    // Adicionar campos de peso/dimensões aqui (ou movê-los para VariacaoProduto se cada variação tiver peso/dimensões diferentes)
    // Manteve-os aqui por enquanto, como estava no código anterior.
    peso: {
        type: DataTypes.DECIMAL(10, 3), // Peso em kg (ex: 0.500)
        allowNull: true,
        defaultValue: 0.300, 
    },
     largura: {
        type: DataTypes.DECIMAL(10, 2), // Largura em cm
        allowNull: true,
        defaultValue: 10.00, 
    },
     altura: {
        type: DataTypes.DECIMAL(10, 2), // Altura em cm
        allowNull: true,
        defaultValue: 10.00, 
    },
     comprimento: {
        type: DataTypes.DECIMAL(10, 2), // Comprimento em cm
        allowNull: true,
        defaultValue: 10.00, 
    },
    // REMOVIDO: 'digital' - Gerenciado via associação VariacaoProduto

  }, {
    sequelize,
    modelName: 'Produto',
     tableName: 'produtos', // Nome da tabela no banco
     timestamps: true, // Habilita createdAt e updatedAt
     paranoid: true, // Habilita soft delete (deletedAt)

     // Adiciona um hook beforeCreate para gerar o slug automaticamente
     hooks: {
        beforeCreate: (produto, options) => {
            if (produto.nome && !produto.slug) { // Gera slug se nome existir e slug não for fornecido
                produto.slug = slugify(produto.nome, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
            }
        },
         beforeUpdate: (produto, options) => {
             // Regenerar slug se o nome mudar E o slug não foi alterado manualmente na mesma operação
             // Isso evita sobrescrever um slug manual se o nome for ligeiramente ajustado
             if (produto.changed('nome') && !options.fields.includes('slug')) {
                  produto.slug = slugify(produto.nome, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
             }
         }
     }
  });
  return Produto;
};