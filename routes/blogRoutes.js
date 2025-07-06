const express = require("express")
const blogController = require("../controllers/blogController")
const autenticar = require("../middleware/autenticar")
const restringirAdmin = require("../middleware/restringirAdmin")
const { verifyToken, isAdmin } = require("../middleware/auth")
const { uploadImage, processUploadedImage } = require('../middleware/upload');

const router = express.Router()

// Rotas públicas
router.get("/", blogController.listarPosts)
router.get("/:slug", blogController.buscarPorSlug)

// Rotas que precisam de autenticação
router.use(autenticar)

// Rotas administrativas
router.get("/admin/todos", verifyToken, isAdmin, blogController.listarTodosAdmin)
router.post("/", verifyToken, isAdmin, blogController.criarPost)
router.put("/:id", verifyToken, isAdmin, blogController.atualizarPost)
router.delete("/:id", verifyToken, isAdmin, blogController.excluirPost)
router.post("/:id/aprovar", verifyToken, isAdmin, blogController.aprovarPost)

// Rota para upload de imagem de destaque do blog
router.post(
    '/upload-imagem',
    verifyToken,
    isAdmin,
    uploadImage.single('imagem'),
    processUploadedImage,
    blogController.uploadImagemDestaque
);

module.exports = router
