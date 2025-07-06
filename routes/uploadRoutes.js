const express = require("express")
const uploadController = require("../controllers/uploadController")
const {
    uploadImage,
    uploadProductFile,
    uploadVideo,
    processUploadedImage,
    processUploadedImages
} = require('../middleware/upload')
const { verifyToken, isAdmin } = require('../middleware/auth')

const router = express.Router()

// Rotas para uploads de produto - requerem autenticação de administrador
router.post(
    '/produtos/:produtoId/imagem',
    verifyToken,
    isAdmin,
    uploadImage.single('imagem'),
    processUploadedImage,
    uploadController.uploadProdutoImagem
);

router.post(
    '/produtos/:produtoId/imagens',
    verifyToken,
    isAdmin,
    uploadImage.array('imagens', 10), // Máximo de 10 imagens por vez
    processUploadedImages,
    uploadController.uploadProdutoImagens
);

router.post(
    '/produtos/:produtoId/arquivo',
    verifyToken,
    isAdmin,
    uploadProductFile.single('arquivo'),
    uploadController.uploadProdutoArquivo
);

// Nova rota para upload de vídeos
router.post(
    '/produtos/:produtoId/video',
    verifyToken,
    isAdmin,
    uploadVideo.single('video'),
    uploadController.uploadProdutoVideo
);

// Definir imagem principal
router.put(
    '/produtos/:produtoId/imagens/:arquivoId/principal',
    verifyToken,
    isAdmin,
    uploadController.definirImagemPrincipal
);

// Atualizar ordem das imagens
router.put(
    '/produtos/:produtoId/imagens/ordem',
    verifyToken,
    isAdmin,
    uploadController.atualizarOrdemImagens
);

// Excluir arquivo
router.delete(
    '/produtos/:produtoId/arquivos/:arquivoId',
    verifyToken,
    isAdmin,
    uploadController.excluirArquivo
);

module.exports = router
