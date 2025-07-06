const favoritoService = require("../services/favoritoService")

const favoritoController = {
  async adicionarFavorito(req, res, next) {
    try {
      const usuarioId = req.user.id
      const { produtoId } = req.body

      if (!produtoId) {
        return res.status(400).json({ erro: "ID do produto é obrigatório" })
      }

      const favorito = await favoritoService.adicionarFavorito(usuarioId, produtoId)
      res.status(201).json(favorito)
    } catch (error) {
      next(error)
    }
  },

  async removerFavorito(req, res, next) {
    try {
      const usuarioId = req.user.id
      const { produtoId } = req.params

      const resultado = await favoritoService.removerFavorito(usuarioId, produtoId)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async listarFavoritos(req, res, next) {
    try {
      const usuarioId = req.user.id
      const favoritos = await favoritoService.listarFavoritos(usuarioId)
      res.json(favoritos)
    } catch (error) {
      next(error)
    }
  },

  async verificarFavorito(req, res, next) {
    try {
      if (!req.user) {
        return res.json({ isFavorito: false });
      }
      const usuarioId = req.user.id
      const { produtoId } = req.params

      const isFavorito = await favoritoService.verificarFavorito(usuarioId, produtoId)
      res.json({ isFavorito: isFavorito })
    } catch (error) {
      next(error)
    }
  },

  async contarFavoritos(req, res, next) {
    try {
      const usuarioId = req.user.id
      const count = await favoritoService.contarFavoritos(usuarioId)
      res.json({ total: count })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = favoritoController
