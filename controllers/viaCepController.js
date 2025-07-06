const viaCepService = require("../services/viaCepService")

const viaCepController = {
  async buscarCep(req, res, next) {
    try {
      const { cep } = req.params

      if (!cep) {
        return res.status(400).json({ erro: "CEP é obrigatório" })
      }

      const endereco = await viaCepService.buscarEnderecoPorCep(cep)
      res.json(endereco)
    } catch (error) {
      next(error)
    }
  },

  async validarCep(req, res, next) {
    try {
      const { cep } = req.params
      const valido = await viaCepService.validarCep(cep)
      res.json({ cep, valido })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = viaCepController
