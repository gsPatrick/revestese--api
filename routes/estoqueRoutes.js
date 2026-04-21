const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/estoqueController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// todas as rotas exigem autenticação de admin
router.use(verifyToken, isAdmin);

// Variações com estoque atual de um produto
router.get('/produtos/:produtoId/variacoes-estoque', ctrl.listarVariacoesEstoque);

// Ajuste de estoque de uma variação (+/-)
router.patch('/produtos/:produtoId/variacoes/:variacaoId/estoque', ctrl.ajustarEstoque);

// Histórico de movimentações do produto
router.get('/produtos/:produtoId/historico-estoque', ctrl.listarHistorico);

module.exports = router;
