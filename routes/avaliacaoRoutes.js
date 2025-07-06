const express = require("express")
const avaliacaoController = require("../controllers/avaliacaoController")
const autenticar = require("../middleware/autenticar")
const restringirAdmin = require("../middleware/restringirAdmin")

const router = express.Router()

// Rotas públicas
router.get("/produto/:produtoId", avaliacaoController.listarAvaliacoesPorProduto)
router.get("/produto/:produtoId/media", avaliacaoController.obterMediaAvaliacoes)

// Rotas que precisam de autenticação
router.use(autenticar)

router.get("/minhas", avaliacaoController.listarMinhasAvaliacoes)
router.get("/:id", avaliacaoController.buscarAvaliacao)
router.post("/", avaliacaoController.criarAvaliacao)
router.put("/:id", avaliacaoController.atualizarAvaliacao)
router.delete("/:id", avaliacaoController.removerAvaliacao)

// Rotas administrativas
router.get("/admin/pendentes", restringirAdmin, avaliacaoController.listarAvaliacoesPendentes)
router.post("/:id/aprovar", restringirAdmin, avaliacaoController.aprovarAvaliacao)

module.exports = router
