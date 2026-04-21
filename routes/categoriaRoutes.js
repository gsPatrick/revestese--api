const express = require("express")
const categoriaController = require("../controllers/categoriaController")
const { verifyToken, isAdmin } = require("../middleware/auth")
const multer = require("multer")

// Memory storage: o buffer é passado diretamente para o uploadService (file server)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const router = express.Router()

// Rotas públicas
router.get("/", categoriaController.listarCategorias)
router.get("/:id", categoriaController.buscarCategoria)

// Upload de ícone personalizado (deve vir antes de /:id)
router.post("/icone/upload", verifyToken, isAdmin, upload.single("icone"), categoriaController.uploadIcone)

// Rotas administrativas
router.post("/", verifyToken, isAdmin, categoriaController.criarCategoria)
router.put("/:id", verifyToken, isAdmin, categoriaController.atualizarCategoria)
router.delete("/:id", verifyToken, isAdmin, categoriaController.removerCategoria)

module.exports = router 