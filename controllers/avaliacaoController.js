const avaliacaoService = require("../services/avaliacaoService")

const avaliacaoController = {
  async criarAvaliacao(req, res, next) {
    try {
      const usuarioId = req.usuario.id
      const avaliacao = await avaliacaoService.criarAvaliacao(usuarioId, req.body)
      res.status(201).json(avaliacao)
    } catch (error) {
      next(error)
    }
  },

  async listarAvaliacoesPorProduto(req, res, next) {
    try {
      const { produtoId } = req.params
      const incluirNaoAprovadas = req.usuario?.tipo === "admin"

      const avaliacoes = await avaliacaoService.listarAvaliacoesPorProduto(produtoId, incluirNaoAprovadas)

      res.json(avaliacoes)
    } catch (error) {
      next(error)
    }
  },

  async listarMinhasAvaliacoes(req, res, next) {
    try {
      const usuarioId = req.usuario.id
      const avaliacoes = await avaliacaoService.listarAvaliacoesPorUsuario(usuarioId)
      res.json(avaliacoes)
    } catch (error) {
      next(error)
    }
  },

  async buscarAvaliacao(req, res, next) {
    try {
      const { id } = req.params
      const avaliacao = await avaliacaoService.buscarAvaliacaoPorId(id)
      res.json(avaliacao)
    } catch (error) {
      next(error)
    }
  },

  async atualizarAvaliacao(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.usuario.id
      const avaliacao = await avaliacaoService.atualizarAvaliacao(id, usuarioId, req.body)
      res.json(avaliacao)
    } catch (error) {
      next(error)
    }
  },

  async removerAvaliacao(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.usuario.id
      const resultado = await avaliacaoService.removerAvaliacao(id, usuarioId)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async aprovarAvaliacao(req, res, next) {
    try {
      const { id } = req.params
      const avaliacao = await avaliacaoService.aprovarAvaliacao(id)
      res.json(avaliacao)
    } catch (error) {
      next(error)
    }
  },

  async listarAvaliacoesPendentes(req, res, next) {
    try {
      const avaliacoes = await avaliacaoService.listarAvaliacoesPendentes()
      res.json(avaliacoes)
    } catch (error) {
      next(error)
    }
  },

  async obterMediaAvaliacoes(req, res, next) {
    try {
      const { produtoId } = req.params
      const media = await avaliacaoService.calcularMediaAvaliacoes(produtoId)
      res.json(media)
    } catch (error) {
      next(error)
    }
  },
}

module.exports = avaliacaoController
