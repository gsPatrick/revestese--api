const express = require("express")
const authController = require("../controllers/authController")
const { validarEntrada, schemas } = require("../middleware/validarEntrada")

const router = express.Router()

router.post("/login", authController.login)
router.post("/register", validarEntrada(schemas.usuario), authController.registrar)
router.post("/google", authController.loginComGoogle)
router.post("/recuperar-senha", authController.recuperarSenha)
router.post("/alterar-senha", authController.alterarSenha)

module.exports = router
