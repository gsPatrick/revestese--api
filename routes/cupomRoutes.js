// src/routes/cupomRoutes.js

const express = require('express');
const router = express.Router();
const cupomController = require('../controllers/cupomController');
const { verifyToken } = require("../middleware/auth");
const autenticarOpcional = require('../middleware/autenticarOpcional');

// Rotas públicas ANTES das rotas com parâmetro /:id
// (rotas específicas devem vir antes de rotas com parâmetros)
router.get('/principal', cupomController.obterCupomPrincipal);
router.post('/validar', autenticarOpcional, cupomController.validarCupom);

// Rotas Admin
router.post('/', verifyToken, cupomController.criarCupom);
router.get('/', verifyToken, cupomController.listarCupons);
router.get('/:id', verifyToken, cupomController.buscarCupom);
router.put('/:id', verifyToken, cupomController.atualizarCupom);
router.delete('/:id', verifyToken, cupomController.excluirCupom);

module.exports = router;