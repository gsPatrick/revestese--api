const subscriptionService = require('../services/subscriptionService');

const createPlano = async (req, res, next) => {
  try {
    const plano = await subscriptionService.createPlano(req.body);
    res.status(201).json(plano);
  } catch (error) {
    next(error);
  }
};

const updatePlano = async (req, res, next) => {
  try {
    const plano = await subscriptionService.updatePlano(req.params.id, req.body);
    res.status(200).json(plano);
  } catch (error) {
    next(error);
  }
};

const listPlanos = async (req, res, next) => {
  try {
    const planos = await subscriptionService.listPlanos();
    res.status(200).json(planos);
  } catch (error) {
    next(error);
  }
};

const getPlano = async (req, res, next) => {
  try {
    const plano = await subscriptionService.getPlano(req.params.id);
    res.status(200).json(plano);
  } catch (error) {
    next(error);
  }
};

const subscribe = async (req, res, next) => {
  try {
    const { planoId, enderecoEntregaId, metodoFreteId } = req.body;
    const usuarioId = req.user.id; // Pegando o ID do usuário autenticado

    const result = await subscriptionService.subscribe({
      planoId,
      usuarioId,
      enderecoEntregaId,
      metodoFreteId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const calculateShipping = async (req, res, next) => {
  try {
    const { planoId, enderecoEntregaId } = req.body;
    const shippingOptions = await subscriptionService.calculateShipping({
      planoId,
      enderecoEntregaId,
    });
    res.status(200).json(shippingOptions);
  } catch (error) {
    next(error);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const result = await subscriptionService.cancelSubscription(usuarioId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const listSubscribers = async (req, res, next) => {
    try {
      const subscribers = await subscriptionService.listSubscribers();
      res.status(200).json(subscribers);
    } catch (error) {
      next(error);
    }
  };

const getMySubscription = async (req, res, next) => {
    try {
        const usuarioId = req.user.id;
        const subscription = await subscriptionService.getMySubscription(usuarioId);
        res.status(200).json(subscription);
    } catch (error) {
        next(error);
    }
};

const handleWebhook = async (req, res, next) => {
    try {
        await subscriptionService.processWebhook(req.body);
        res.status(200).send('Webhook processado com sucesso.');
    } catch (error) {
        console.error('Erro no webhook de assinatura:', error);
        next(error);
    }
};

const deletePlano = async (req, res, next) => {
  try {
    await subscriptionService.deletePlano(req.params.id);
    res.status(200).json({ message: "Plano excluído com sucesso." });
  } catch (error) {
    // Passa o erro para o middleware de erro, que irá formatá-lo
    next(error);
  }
};

module.exports = {
  createPlano,
  updatePlano,
  listPlanos,
  getPlano,
  subscribe,
  cancelSubscription,
  listSubscribers,
  calculateShipping,
  getMySubscription,
  handleWebhook,
  deletePlano,
}; 