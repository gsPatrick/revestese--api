const express = require("express")
const enderecoController = require("../controllers/enderecoController")
const { verifyToken } = require("../middleware/auth")

const router = express.Router()

// Rota pública para validação de CEP
router.post("/validar-cep", enderecoController.validarCep)

// Rotas autenticadas
router.use(verifyToken)

router.get("/", enderecoController.listarEnderecos)
router.get("/principal", enderecoController.buscarPrincipal)
router.get("/:id", enderecoController.buscarEndereco)
router.post("/", enderecoController.criarEndereco)
router.put("/:id", enderecoController.atualizarEndereco)
router.delete("/:id", enderecoController.removerEndereco)
router.post("/:id/principal", enderecoController.definirPrincipal)
router.patch("/:id/padrao", enderecoController.definirEnderecoPadrao)

module.exports = router
