const Usuario = require("./Usuario")
const Produto = require("./Produto")
const ArquivoProduto = require("./ArquivoProduto")
const Pedido = require("./Pedido")
const EnderecoUsuario = require("./EnderecoUsuario")
const Frete = require("./Frete")
const MetodoFrete = require("./MetodoFrete")
const Pagamento = require("./Pagamento")
const Cupom = require("./Cupom")
const Categoria = require("./Categoria")
const Avaliacao = require("./Avaliacao")
const PostBlog = require("./PostBlog")
const Favorito = require("./Favorito")
const ConfiguracaoLoja = require("./ConfiguracaoLoja")
const PlanoAssinatura = require("./PlanoAssinatura")
const AssinaturaUsuario = require("./AssinaturaUsuario")
const PlanoAssinaturaProduto = require("./PlanoAssinaturaProduto")
const VariacaoProduto = require("./VariacaoProduto")

// Definir associações
Usuario.hasMany(Pedido, { foreignKey: "usuarioId" })
Pedido.belongsTo(Usuario, { foreignKey: "usuarioId" })


Usuario.hasMany(EnderecoUsuario, { foreignKey: "usuarioId" })
EnderecoUsuario.belongsTo(Usuario, { foreignKey: "usuarioId" })

Produto.hasMany(ArquivoProduto, { foreignKey: "produtoId", as: "ArquivoProdutos" })
ArquivoProduto.belongsTo(Produto, { foreignKey: "produtoId" })

Categoria.hasMany(Produto, { foreignKey: 'categoriaId', as: 'produtos' });
Produto.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });

Pedido.hasOne(Frete, { foreignKey: "pedidoId" })
Frete.belongsTo(Pedido, { foreignKey: "pedidoId" })

Pedido.hasMany(Pagamento, { foreignKey: "pedidoId" })
Pagamento.belongsTo(Pedido, { foreignKey: "pedidoId" })

Usuario.hasMany(Pagamento, { foreignKey: "usuarioId" })
Pagamento.belongsTo(Usuario, { foreignKey: "usuarioId" })

Produto.hasMany(Avaliacao, { foreignKey: "produtoId" })
Avaliacao.belongsTo(Produto, { foreignKey: "produtoId" })

Usuario.hasMany(Avaliacao, { foreignKey: "usuarioId" })
Avaliacao.belongsTo(Usuario, { foreignKey: "usuarioId" })

Usuario.hasMany(PostBlog, { foreignKey: "autorId" })
PostBlog.belongsTo(Usuario, { foreignKey: "autorId" })

// Adicionar as associações dos favoritos
Usuario.hasMany(Favorito, { foreignKey: "usuarioId" })
Favorito.belongsTo(Usuario, { foreignKey: "usuarioId" })

Produto.hasMany(Favorito, { foreignKey: "produtoId" })
Favorito.belongsTo(Produto, { foreignKey: "produtoId" })

// Novas associações de Assinatura
PlanoAssinatura.belongsToMany(Produto, {
  through: PlanoAssinaturaProduto,
  foreignKey: "planoId",
  as: "produtos",
})
Produto.belongsToMany(PlanoAssinatura, {
  through: PlanoAssinaturaProduto,
  foreignKey: "produtoId",
  as: "planos",
})

Usuario.hasMany(AssinaturaUsuario, { 
  foreignKey: "usuarioId", 
  as: "assinaturas",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
})
AssinaturaUsuario.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  as: "usuario",
})

PlanoAssinatura.hasMany(AssinaturaUsuario, { foreignKey: "planoId", as: "assinaturas" })
AssinaturaUsuario.belongsTo(PlanoAssinatura, { foreignKey: "planoId", as: "plano" })

EnderecoUsuario.hasMany(AssinaturaUsuario, { foreignKey: "enderecoEntregaId", as: "assinaturas" })
AssinaturaUsuario.belongsTo(EnderecoUsuario, { foreignKey: "enderecoEntregaId", as: "enderecoEntrega" })

Produto.hasMany(VariacaoProduto, { foreignKey: "produtoId", as: "variacoes" })
VariacaoProduto.belongsTo(Produto, { foreignKey: "produtoId", as: "produto" })

module.exports = {
  Usuario,
  Produto,
  ArquivoProduto,
  Pedido,
  EnderecoUsuario,
  Frete,
  MetodoFrete,
  Pagamento,
  Cupom,
  Categoria,
  Avaliacao,
  PostBlog,
  Favorito,
  ConfiguracaoLoja,
  PlanoAssinatura,
  AssinaturaUsuario,
  PlanoAssinaturaProduto,
  VariacaoProduto,
}
