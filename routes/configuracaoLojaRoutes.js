const express = require("express")
const configuracaoLojaController = require("../controllers/configuracaoLojaController")
const autenticar = require("../middleware/autenticar")
const restringirAdmin = require("../middleware/restringirAdmin")

const router = express.Router()

// Rota pública para obter configurações básicas da loja
router.get("/publicas", configuracaoLojaController.obterConfiguracoes)

// Rotas administrativas
router.use(autenticar, restringirAdmin)

router.get("/", configuracaoLojaController.obterConfiguracoes)
router.put("/", configuracaoLojaController.atualizarConfiguracoes)
router.get("/:chave", configuracaoLojaController.obterConfiguracao)
router.put("/:chave", configuracaoLojaController.definirConfiguracao)
router.post("/inicializar", configuracaoLojaController.inicializarPadrao)

module.exports = router
