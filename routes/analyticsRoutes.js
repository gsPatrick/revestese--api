const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
const { verifyToken, isAdmin } = require('../middleware/auth');
const autenticarOpcional = require('../middleware/autenticarOpcional');

// Público — tracking (nunca falha o cliente)
router.post('/pageview',   autenticarOpcional, ctrl.trackPageview);
router.post('/carrinho',   ctrl.trackCarrinho);
router.put('/carrinho/convertido', ctrl.marcarConvertido);

// Admin — leitura de dados
router.get('/acessos',                verifyToken, isAdmin, ctrl.getAcessos);
router.get('/produtos-vistos',        verifyToken, isAdmin, ctrl.getProdutosVistos);
router.get('/carrinhos-abandonados',  verifyToken, isAdmin, ctrl.getCarrinhosAbandonados);
router.get('/clientes',               verifyToken, isAdmin, ctrl.getClientes);
router.get('/clientes/:id',           verifyToken, isAdmin, ctrl.getClienteDetalhe);

module.exports = router;
