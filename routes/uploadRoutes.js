// src/routes/uploadRoutes.js

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); 

// --- ROTAS DE UPLOAD ---

// Upload de MÚLTIPLAS imagens de produto
// O nome do campo no formulário do frontend deve ser 'files' (ou o que você definir)
router.post('/produtos/:produtoId/imagens', upload.array('files', 10), uploadController.uploadProdutoImagens);

// Upload de arquivo DIGITAL de produto
// O nome do campo no formulário do frontend deve ser 'file'
router.post('/produtos/:produtoId/arquivo', upload.single('file'), uploadController.uploadProdutoArquivo);

// Upload de VÍDEO de produto
// O nome do campo no formulário do frontend deve ser 'file'
router.post('/produtos/:produtoId/video', upload.single('file'), uploadController.uploadProdutoVideo);

// Rota para definir imagem principal
router.put('/produtos/:produtoId/imagens/:arquivoId/principal', uploadController.definirImagemPrincipal);

// Rota para atualizar ordem das imagens
router.put('/produtos/:produtoId/imagens/ordem', uploadController.atualizarOrdemImagens);

// Rota para excluir arquivos (imagens, digitais, vídeos)
router.delete('/arquivos/:arquivoId', verifyToken, isAdmin, uploadController.excluirArquivo);


module.exports = router;