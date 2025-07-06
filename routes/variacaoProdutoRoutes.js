const express = require('express')
const router = express.Router({ mergeParams: true })

const variacaoProdutoController = require('../controllers/variacaoProdutoController')
const { verifyToken, isAdmin } = require('../middleware/auth')

// As rotas são aninhadas em /api/produtos/:produtoId/variacoes
router.post('/', verifyToken, isAdmin, variacaoProdutoController.criar)
router.post('/lote', verifyToken, isAdmin, variacaoProdutoController.criarEmLote)
router.get('/', variacaoProdutoController.listar)
router.put('/:id', verifyToken, isAdmin, variacaoProdutoController.atualizar)
router.delete('/:id', verifyToken, isAdmin, variacaoProdutoController.remover)

module.exports = router
