const express = require("express")
const viaCepController = require("../controllers/viaCepController")

const router = express.Router()

// Rotas públicas para consulta de CEP
router.get("/:cep", viaCepController.buscarCep)
router.get("/:cep/validar", viaCepController.validarCep)

module.exports = router
