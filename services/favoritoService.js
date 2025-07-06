const { Favorito, Produto, Usuario } = require("../models")

const favoritoService = {
  async adicionarFavorito(usuarioId, produtoId) {
    try {
      // Verificar se o produto existe
      const produto = await Produto.findByPk(produtoId)
      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      // Verificar se já está nos favoritos
      const favoritoExistente = await Favorito.findOne({
        where: { usuarioId, produtoId },
      })

      if (favoritoExistente) {
        throw new Error("Produto já está nos favoritos")
      }

      const favorito = await Favorito.create({ usuarioId, produtoId })
      return favorito
    } catch (error) {
      throw error
    }
  },

  async removerFavorito(usuarioId, produtoId) {
    try {
      const favorito = await Favorito.findOne({
        where: { usuarioId, produtoId },
      })

      if (!favorito) {
        throw new Error("Produto não está nos favoritos")
      }

      await favorito.destroy()
      return { message: "Produto removido dos favoritos" }
    } catch (error) {
      throw error
    }
  },

  async listarFavoritos(usuarioId) {
    try {
      const favoritos = await Favorito.findAll({
        where: { usuarioId },
        include: [
          {
            model: Produto,
            where: { ativo: true },
            attributes: {
              exclude: ['itensDownload', 'updatedAt'] 
            }
          },
        ],
        order: [["createdAt", "DESC"]],
      })

      return favoritos.map((fav) => fav.Produto)
    } catch (error) {
      throw error
    }
  },

  async verificarFavorito(usuarioId, produtoId) {
    try {
      const favorito = await Favorito.findOne({
        where: { usuarioId, produtoId },
      })

      return !!favorito
    } catch (error) {
      throw error
    }
  },

  async contarFavoritos(usuarioId) {
    try {
      const count = await Favorito.count({
        where: { usuarioId },
      })

      return count
    } catch (error) {
      throw error
    }
  },
}

module.exports = favoritoService
