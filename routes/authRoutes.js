const express = require("express")
const authController = require("../controllers/authController")
const { validarEntrada, schemas } = require("../middleware/validarEntrada")

const router = express.Router()

router.post("/login", authController.login)
router.post("/register", validarEntrada(schemas.usuario), authController.registrar)
router.post("/google", authController.loginComGoogle)
router.post("/recuperar-senha", authController.recuperarSenha)
router.post("/alterar-senha", authController.alterarSenha)
router.post("/create-admin", authController.criarAdmin)
router.get("/melhor-envio/callback", authController.handleMelhorEnvioCallback)

module.exports = router
