const cupomService = require("../services/cupomService")

const cupomController = {
  async criarCupom(req, res, next) {
    try {
      const cupom = await cupomService.criarCupom(req.body)
      res.status(201).json(cupom)
    } catch (error) {
      next(error)
    }
  },

  async validarCupom(req, res, next) {
    try {
      const { codigo } = req.body

      if (!codigo) {
        return res.status(400).json({ erro: "Código do cupom é obrigatório" })
      }

      const cupom = await cupomService.validarCupom(codigo)
      res.json({
        valido: true,
        cupom: {
          codigo: cupom.codigo,
          valor: cupom.valor,
          tipo: cupom.tipo,
        },
      })
    } catch (error) {
      res.status(400).json({
        valido: false,
        erro: error.message,
      })
    }
  },

  async listarCupons(req, res, next) {
    try {
      const cupons = await cupomService.listarCupons()
      res.json(cupons)
    } catch (error) {
      next(error)
    }
  },

  async aplicarCupom(req, res, next) {
    try {
      const { codigo, total } = req.body

      if (!codigo || !total) {
        return res.status(400).json({ erro: "Código e total são obrigatórios" })
      }

      const resultado = await cupomService.aplicarCupom({ total }, codigo)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async buscarCupom(req, res, next) {
    try {
      const { id } = req.params
      const cupom = await cupomService.buscarCupomPorId(id)
      res.json(cupom)
    } catch (error) {
      next(error)
    }
  },

  async atualizarCupom(req, res, next) {
    try {
      const { id } = req.params
      const cupom = await cupomService.atualizarCupom(id, req.body)
      res.json(cupom)
    } catch (error) {
      next(error)
    }
  },

  async excluirCupom(req, res, next) {
    try {
      const { id } = req.params
      const resultado = await cupomService.excluirCupom(id)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = cupomController
