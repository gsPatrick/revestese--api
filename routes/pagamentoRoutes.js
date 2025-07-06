const express = require("express")
const pagamentoController = require("../controllers/pagamentoController")
const autenticar = require("../middleware/autenticar")
const restringirAdmin = require("../middleware/restringirAdmin")

const router = express.Router()

// Webhook do Mercado Pago (sem autenticação)
router.post("/webhook", pagamentoController.webhook)

// Rotas que precisam de autenticação
router.use(autenticar)

router.post("/checkout", pagamentoController.criarCheckout)
router.get("/status/:pedidoId", pagamentoController.verificarStatus)
router.get("/", pagamentoController.listarPagamentos)

module.exports = router
