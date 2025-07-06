const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { verifyToken, isAdmin } = require("../middleware/auth");

// Rotas para Admin gerenciar planos
router.post(
  '/planos',
  verifyToken,
  isAdmin,
  subscriptionController.createPlano
);
router.put(
  '/planos/:id',
  verifyToken,
  isAdmin,
  subscriptionController.updatePlano
);
router.get(
    '/planos', 
    subscriptionController.listPlanos
);
router.get(
    '/planos/:id', 
    subscriptionController.getPlano
);

router.delete(
  '/planos/:id',
  verifyToken,
  isAdmin,
  subscriptionController.deletePlano
);

// Rota para usuário se inscrever
router.post(
  '/subscribe',
  verifyToken,
  subscriptionController.subscribe
);

// Rota para calcular frete da assinatura
router.post(
  '/calculate-shipping',
  verifyToken,
  subscriptionController.calculateShipping
);

// Rota para cancelar assinatura
router.post(
  '/cancel',
  verifyToken,
  subscriptionController.cancelSubscription
);

// Rota para listar assinantes (admin)
router.get(
  '/subscribers',
  verifyToken,
  isAdmin,
  subscriptionController.listSubscribers
);

// Rota para usuário ver sua assinatura
router.get(
    '/minha-assinatura',
    verifyToken,
    subscriptionController.getMySubscription
);

// Rota para webhook do Mercado Pago
router.post('/webhook', subscriptionController.handleWebhook);

module.exports = router;