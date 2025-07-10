// Exemplo: src/routes/cupomRoutes.js

const express = require('express');
const router = express.Router();
const cupomController = require('../controllers/cupomController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware'); // Seus middlewares de autenticação/permissão

// Rotas de Cupons
router.post('/', verifyToken, checkPermission(['admin']), cupomController.criarCupom);
router.get('/', verifyToken, checkPermission(['admin']), cupomController.listarCupons); // Filtragem invisivel já implementada
router.get('/principal', cupomController.obterCupomPrincipal); // NOVO ENDPOINT: Acessível publicamente para pop-up
router.post('/validar', cupomController.validarCupom); // Pode ser público se a validação não expuser dados sensíveis
router.post('/aplicar', cupomController.aplicarCupom); // Pode ser público
router.get('/:id', verifyToken, checkPermission(['admin']), cupomController.buscarCupom);
router.put('/:id', verifyToken, checkPermission(['admin']), cupomController.atualizarCupom);
router.delete('/:id', verifyToken, checkPermission(['admin']), cupomController.excluirCupom);

module.exports = router;