const express = require("express")
const relatorioController = require("../controllers/relatorioController")
const { verifyToken, isAdmin } = require("../middleware/auth")

const router = express.Router()

// Todas as rotas de relatório requerem autenticação e permissão de admin
router.use(verifyToken, isAdmin)

// Relatórios de vendas
router.get("/vendas", relatorioController.vendasPorPeriodo)
router.get("/produtos-mais-vendidos", relatorioController.produtosMaisVendidos)
router.get("/desempenho-cupons", relatorioController.desempenhoCupons)
router.get("/clientes-ativos", relatorioController.clientesMaisAtivos)

module.exports = router
