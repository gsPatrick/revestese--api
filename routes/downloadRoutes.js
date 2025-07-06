const express = require("express")
const downloadController = require("../controllers/downloadController")
const autenticar = require("../middleware/autenticar")

const router = express.Router()

router.use(autenticar) // Todas as rotas de download precisam de autenticação

router.get("/produtos-pagos", downloadController.produtosPagos)
router.get("/arquivo/:produtoId/:arquivoId", downloadController.baixarArquivo)

module.exports = router
