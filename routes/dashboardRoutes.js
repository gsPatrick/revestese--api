const express = require("express")
const dashboardController = require("../controllers/dashboardController")
const { verifyToken, isAdmin } = require("../middleware/auth")

const router = express.Router()

router.use(verifyToken, isAdmin) // Apenas admins

router.get("/metricas", dashboardController.obterMetricas)
router.get("/vendas", dashboardController.obterVendasPorPeriodo)
router.get("/produtos-mais-vendidos", dashboardController.obterProdutosMaisVendidos)
router.get("/clientes-top", dashboardController.obterClientesTop)

module.exports = router
