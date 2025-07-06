const pagamentoService = require("../services/pagamentoService")

const pagamentoController = {
  async criarCheckout(req, res, next) {
    try {
      const { pedidoId } = req.body
      const usuarioId = req.usuario.id

      if (!pedidoId) {
        return res.status(400).json({ erro: "ID do pedido é obrigatório" })
      }

      const checkout = await pagamentoService.criarCheckoutPro(pedidoId, usuarioId)
      res.json(checkout)
    } catch (error) {
      next(error)
    }
  },

  async webhook(req, res, next) {
    try {
      await pagamentoService.processarWebhook(req.body)
      res.status(200).json({ message: "Webhook processado" })
    } catch (error) {
      console.error("Erro no webhook:", error)
      res.status(200).json({ message: "Webhook recebido" }) // Sempre retornar 200 para o MP
    }
  },

  async verificarStatus(req, res, next) {
    try {
      const { pedidoId } = req.params
      const pagamento = await pagamentoService.verificarStatusPagamento(pedidoId)
      res.json(pagamento)
    } catch (error) {
      next(error)
    }
  },

  async listarPagamentos(req, res, next) {
    try {
      const filtros = req.query

      // Se não for admin, filtrar apenas pagamentos do usuário
      if (req.usuario.tipo !== "admin") {
        filtros.usuarioId = req.usuario.id
      }

      const pagamentos = await pagamentoService.listarPagamentos(filtros)
      res.json(pagamentos)
    } catch (error) {
      next(error)
    }
  },
}

module.exports = pagamentoController
