const express = require("express")
const freteController = require("../controllers/freteController")
const autenticar = require("../middleware/autenticar")
const restringirAdmin = require("../middleware/restringirAdmin")

const router = express.Router()

router.use(autenticar) // Todas as rotas de frete precisam de autenticação

router.post("/calcular", freteController.calcular)
router.get("/rastrear/:codigoRastreio", freteController.rastrear)

// Rotas administrativas
router.post("/gerar-etiqueta", restringirAdmin, freteController.gerarEtiqueta)
router.post("/cancelar-etiqueta", restringirAdmin, freteController.cancelarEtiqueta)

// Rotas para métodos de frete personalizados
router.get("/metodos", freteController.listarMetodosFrete)
router.get("/metodos/:id", freteController.obterMetodoFrete)
router.post("/metodos", restringirAdmin, freteController.criarMetodoFrete)
router.put("/metodos/:id", restringirAdmin, freteController.atualizarMetodoFrete)
router.delete("/metodos/:id", restringirAdmin, freteController.removerMetodoFrete)

module.exports = router
