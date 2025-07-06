const configuracaoLojaService = require("../services/configuracaoLojaService")

const configuracaoLojaController = {
  async obterConfiguracoes(req, res, next) {
    try {
      const configuracoes = await configuracaoLojaService.obterTodasConfiguracoes()
      res.json(configuracoes)
    } catch (error) {
      next(error)
    }
  },

  async atualizarConfiguracoes(req, res, next) {
    try {
      const configuracoes = await configuracaoLojaService.atualizarConfiguracoes(req.body)
      res.json(configuracoes)
    } catch (error) {
      next(error)
    }
  },

  async obterConfiguracao(req, res, next) {
    try {
      const { chave } = req.params
      const valor = await configuracaoLojaService.obterConfiguracao(chave)
      res.json({ chave, valor })
    } catch (error) {
      next(error)
    }
  },

  async definirConfiguracao(req, res, next) {
    try {
      const { chave } = req.params
      const { valor, tipo, descricao } = req.body

      const config = await configuracaoLojaService.definirConfiguracao(chave, valor, tipo, descricao)
      res.json(config)
    } catch (error) {
      next(error)
    }
  },

  async inicializarPadrao(req, res, next) {
    try {
      const configuracoes = await configuracaoLojaService.inicializarConfiguracoesPadrao()
      res.json(configuracoes)
    } catch (error) {
      next(error)
    }
  },
}

module.exports = configuracaoLojaController
