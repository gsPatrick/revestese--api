const dashboardService = require("../services/dashboardService")

const dashboardController = {
  async obterMetricas(req, res, next) {
    try {
      const metricas = await dashboardService.obterMetricasGerais()
      res.json(metricas)
    } catch (error) {
      next(error)
    }
  },

  async obterVendasPorPeriodo(req, res, next) {
    try {
      const { periodo = "mes" } = req.query
      const vendas = await dashboardService.obterVendasPorPeriodo(periodo)
      res.json(vendas)
    } catch (error) {
      next(error)
    }
  },

  async obterProdutosMaisVendidos(req, res, next) {
    try {
      const { limit = 10 } = req.query
      const produtos = await dashboardService.obterProdutosMaisVendidos(Number.parseInt(limit))
      res.json(produtos)
    } catch (error) {
      next(error)
    }
  },

  async obterClientesTop(req, res, next) {
    try {
      const { limit = 10 } = req.query
      const clientes = await dashboardService.obterClientesTop(Number.parseInt(limit))
      res.json(clientes)
    } catch (error) {
      next(error)
    }
  },
}

module.exports = dashboardController
