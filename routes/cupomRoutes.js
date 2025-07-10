// Exemplo: src/routes/cupomRoutes.js

const express = require('express');
const router = express.Router();
const cupomController = require('../controllers/cupomController');
const { verifyToken} = require("../middleware/auth")

// Rotas de Cupons
router.post('/', verifyToken, cupomController.criarCupom);
router.get('/', verifyToken, cupomController.listarCupons); // Filtragem invisivel já implementada
router.get('/principal', cupomController.obterCupomPrincipal); // NOVO ENDPOINT: Acessível publicamente para pop-up
router.post('/validar', cupomController.validarCupom); // Pode ser público se a validação não expuser dados sensíveis
router.post('/aplicar', cupomController.aplicarCupom); // Pode ser público
router.get('/:id', verifyToken, cupomController.buscarCupom);
router.put('/:id', verifyToken, cupomController.atualizarCupom);
router.delete('/:id', verifyToken, cupomController.excluirCupom);

module.exports = router;