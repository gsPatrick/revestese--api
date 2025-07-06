const express = require("express")
const categoriaController = require("../controllers/categoriaController")
const { verifyToken, isAdmin } = require("../middleware/auth")

const router = express.Router()

// Rotas públicas
router.get("/", categoriaController.listarCategorias)
router.get("/:id", categoriaController.buscarCategoria)

// Rotas administrativas
router.post("/", verifyToken, isAdmin, categoriaController.criarCategoria)
router.put("/:id", verifyToken, isAdmin, categoriaController.atualizarCategoria)
router.delete("/:id", verifyToken, isAdmin, categoriaController.removerCategoria)

module.exports = router 