const express = require("express")
const cupomController = require("../controllers/cupomController")
const { verifyToken, isAdmin } = require("../middleware/auth")

const router = express.Router()

// Rotas públicas/cliente
router.post("/validar", cupomController.validarCupom)
router.post("/aplicar", cupomController.aplicarCupom)

// Rotas administrativas
router.get("/", verifyToken, isAdmin, cupomController.listarCupons)
router.post("/", verifyToken, isAdmin, cupomController.criarCupom)
router.get("/:id", verifyToken, isAdmin, cupomController.buscarCupom)
router.put("/:id", verifyToken, isAdmin, cupomController.atualizarCupom)
router.delete("/:id", verifyToken, isAdmin, cupomController.excluirCupom)

module.exports = router
