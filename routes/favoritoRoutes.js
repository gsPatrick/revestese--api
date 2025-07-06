const express = require("express")
const favoritoController = require("../controllers/favoritoController")
const { verifyToken } = require("../middleware/auth")

const router = express.Router()

// Todas as rotas de favoritos requerem autenticação
router.use(verifyToken)

router.get("/", favoritoController.listarFavoritos)
router.post("/", favoritoController.adicionarFavorito)
router.delete("/:produtoId", favoritoController.removerFavorito)
router.get("/verificar/:produtoId", favoritoController.verificarFavorito)
router.get("/contar", favoritoController.contarFavoritos)

module.exports = router
