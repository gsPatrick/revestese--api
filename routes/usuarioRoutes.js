const express = require("express")
const usuarioController = require("../controllers/usuarioController")
const { verifyToken, isAdmin } = require("../middleware/auth")
const { validarEntrada, schemas } = require("../middleware/validarEntrada")

const router = express.Router()

// Rotas para cliente (perfil próprio)
router.get("/perfil", verifyToken, usuarioController.obterPerfil)
router.put("/perfil", verifyToken, validarEntrada(schemas.atualizarPerfil), usuarioController.atualizarPerfil)
router.put("/perfil/alterar-senha", verifyToken, validarEntrada(schemas.alterarSenha), usuarioController.alterarSenha)

// Rotas administrativas (gerenciamento de usuários)
router.post("/", verifyToken, isAdmin, usuarioController.criarUsuario)
router.get("/", verifyToken, isAdmin, usuarioController.listarUsuarios)
router.get("/:id", verifyToken, isAdmin, usuarioController.obterUsuario)
router.put("/:id", verifyToken, isAdmin, validarEntrada(schemas.atualizarUsuario), usuarioController.atualizarUsuario)
router.delete("/:id", verifyToken, isAdmin, usuarioController.excluirUsuario)

module.exports = router 