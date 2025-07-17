// src/routes/cupomRoutes.js

const express = require('express');
const router = express.Router();
const cupomController = require('../controllers/cupomController');
const { verifyToken } = require("../middleware/auth");
const autenticarOpcional = require('../middleware/autenticarOpcional');

// Rotas Admin
router.post('/', verifyToken, cupomController.criarCupom);
router.get('/', verifyToken, cupomController.listarCupons);
router.get('/:id', verifyToken, cupomController.buscarCupom);
router.put('/:id', verifyToken, cupomController.atualizarCupom);
router.delete('/:id', verifyToken, cupomController.excluirCupom);

// Rotas Públicas/Cliente
router.get('/principal', cupomController.obterCupomPrincipal);

// --- ROTA ATUALIZADA ---
// Rota para validar o cupom (sem aplicar/gastar o uso)
router.post('/validar', autenticarOpcional, cupomController.validarCupom);

module.exports = router;