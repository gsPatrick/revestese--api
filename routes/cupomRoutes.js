// src/routes/cupomRoutes.js

const express = require('express');
const router = express.Router();
const cupomController = require('../controllers/cupomController');
const { verifyToken } = require("../middleware/auth"); // verifyToken para rotas de admin
const autenticarOpcional = require('../middleware/autenticarOpcional'); // Importa o novo middleware

// Rotas de Cupons
router.post('/', verifyToken, cupomController.criarCupom);
router.get('/', verifyToken, cupomController.listarCupons);
router.get('/principal', cupomController.obterCupomPrincipal);

// ALTERAÇÃO AQUI: Aplicando o middleware opcional
router.post('/validar', autenticarOpcional, cupomController.validarCupom);
router.post('/aplicar', autenticarOpcional, cupomController.aplicarCupom);

router.get('/:id', verifyToken, cupomController.buscarCupom);
router.put('/:id', verifyToken, cupomController.atualizarCupom);
router.delete('/:id', verifyToken, cupomController.excluirCupom);

module.exports = router;