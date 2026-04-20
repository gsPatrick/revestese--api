const express = require("express")
const categoriaController = require("../controllers/categoriaController")
const { verifyToken, isAdmin } = require("../middleware/auth")
const { singleUpload } = require("../middleware/upload")

const router = express.Router()

// Rotas públicas
router.get("/", categoriaController.listarCategorias)
router.get("/:id", categoriaController.buscarCategoria)

// Upload de ícone personalizado (deve vir antes de /:id)
router.post("/icone/upload", verifyToken, isAdmin, ...singleUpload("icone"), categoriaController.uploadIcone)

// Rotas administrativas
router.post("/", verifyToken, isAdmin, categoriaController.criarCategoria)
router.put("/:id", verifyToken, isAdmin, categoriaController.atualizarCategoria)
router.delete("/:id", verifyToken, isAdmin, categoriaController.removerCategoria)

module.exports = router 