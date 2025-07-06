const { PlanoAssinatura, Produto, Usuario, EnderecoUsuario, ConfiguracaoLoja, AssinaturaUsuario } = require('../models');
const mercadopago = require('../config/mercadoPago');
const freteService = require('../services/freteService');

const createPlano = async (planoData) => {
  const { nome, descricao, preco, frequencia, produtoIds } = planoData;

  const plano = await PlanoAssinatura.create({
    nome,
    descricao,
    preco,
    frequencia,
  });

  if (produtoIds && produtoIds.length > 0) {
    const produtos = await Produto.findAll({
      where: {
        id: produtoIds,
      },
    });
    await plano.addProdutos(produtos);
  }

  return plano;
};

const updatePlano = async (planoId, planoData) => {
  const { nome, descricao, preco, frequencia, produtoIds, ativo } = planoData;

  const plano = await PlanoAssinatura.findByPk(planoId);
  if (!plano) {
    throw new Error('Plano não encontrado');
  }

  await plano.update({ nome, descricao, preco, frequencia, ativo });

  if (produtoIds) {
    const produtos = await Produto.findAll({
      where: {
        id: produtoIds,
      },
    });
    await plano.setProdutos(produtos);
  }

  return plano;
};

const listPlanos = async () => {
  const planos = await PlanoAssinatura.findAll({
    where: { ativo: true },
    include: [{
      model: Produto,
      as: 'produtos'
    }],
  });
  return planos;
};

const getPlano = async (planoId) => {
  const plano = await PlanoAssinatura.findByPk(planoId, {
    include: 'produtos',
  });
  if (!plano) {
    throw new Error('Plano não encontrado');
  }
  return plano;
};

const subscribe = async (subscribeData) => {
    const { planoId, usuarioId, enderecoEntregaId, metodoFreteId } = subscribeData;

    // 1. Obter dados
    const plano = await PlanoAssinatura.findByPk(planoId, { include: ['produtos'] });
    if (!plano || !plano.ativo) throw new Error('Plano de assinatura não encontrado ou inativo.');

    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) throw new Error('Usuário não encontrado.');

    const enderecoEntrega = await EnderecoUsuario.findByPk(enderecoEntregaId);
    if (!enderecoEntrega) throw new Error('Endereço de entrega não encontrado.');

    // 2. Obter endereço de origem da loja
    const configs = await ConfiguracaoLoja.findAll();
    const enderecoOrigem = {
        cep: configs.find(c => c.chave === 'endereco_origem_cep')?.valor,
        // Adicionar outros campos de endereço de origem se necessário
    };
    if (!enderecoOrigem.cep) throw new Error('Endereço de origem da loja não configurado.');

    // 3. Calcular frete
    const itens = plano.produtos.map(p => ({
        produtoId: p.id,
        quantidade: 1, // Assumindo 1 unidade de cada produto do plano
    }));
    const opcoesFrete = await freteService.calcularFrete(enderecoOrigem, enderecoEntrega, itens);
    
    const freteEscolhido = opcoesFrete.find(f => f.id == metodoFreteId);
    if (!freteEscolhido) throw new Error('Método de frete inválido.');
    
    const valorFrete = parseFloat(freteEscolhido.price);
    const metodoFreteNome = freteEscolhido.name;

    // 4. Criar subscrição no Mercado Pago
    const totalAssinatura = parseFloat(plano.preco) + valorFrete;

    const recurring = {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: totalAssinatura,
        currency_id: 'BRL',
    };

    switch (plano.frequencia) {
        case 'trimestral':
            recurring.frequency = 3;
            break;
        case 'anual':
            recurring.frequency = 1;
            recurring.frequency_type = 'years';
            break;
    }

    const preapprovalData = {
        reason: `Assinatura do plano: ${plano.nome}`,
        payer_email: usuario.email,
        external_reference: JSON.stringify({
            planoId: plano.id,
            usuarioId: usuario.id,
            enderecoEntregaId: enderecoEntrega.id,
            valorFrete: valorFrete,
            metodoFrete: metodoFreteNome,
        }),
        auto_recurring: recurring,
        back_urls: {
            success: `${process.env.FRONTEND_URL}/assinatura/sucesso`,
            failure: `${process.env.FRONTEND_URL}/assinatura/erro`,
            pending: `${process.env.FRONTEND_URL}/assinatura/pendente`,
        },
        status: 'authorized',
    };
    
    const preapproval = await mercadopago.preapproval.create(preapprovalData);
    
    if (!preapproval.body.init_point) {
        throw new Error('Falha ao criar link de pagamento para a assinatura.');
    }

    return { checkoutUrl: preapproval.body.init_point };
};

const calculateShipping = async (data) => {
    const { planoId, enderecoEntregaId } = data;
  
    // 1. Obter dados
    const plano = await PlanoAssinatura.findByPk(planoId, { include: ['produtos'] });
    if (!plano) throw new Error('Plano de assinatura não encontrado.');
  
    const enderecoEntrega = await EnderecoUsuario.findByPk(enderecoEntregaId);
    if (!enderecoEntrega) throw new Error('Endereço de entrega não encontrado.');
  
    // 2. Obter endereço de origem da loja
    const configs = await ConfiguracaoLoja.findAll({ where: { chave: 'endereco_origem_cep' } });
    const enderecoOrigem = {
      cep: configs.length > 0 ? configs[0].valor : null,
    };
    if (!enderecoOrigem.cep) throw new Error('Endereço de origem da loja não configurado.');
  
    // 3. Calcular frete
    const itens = plano.produtos.map(p => ({
      produtoId: p.id,
      quantidade: 1,
      preco: p.preco, // freteService pode precisar do preço para o seguro
    }));
  
    return await freteService.calcularFrete(enderecoOrigem, enderecoEntrega, itens);
  };

const cancelSubscription = async (usuarioId) => {
    const assinatura = await AssinaturaUsuario.findOne({
      where: {
        usuarioId,
        status: 'ativa', // Apenas permite cancelar assinaturas ativas
      },
    });
  
    if (!assinatura) {
      throw new Error('Nenhuma assinatura ativa encontrada para este usuário.');
    }
  
    // Cancela a assinatura no Mercado Pago
    const mpResponse = await mercadopago.preapproval.update(assinatura.mercadoPagoSubscriptionId, {
      status: 'cancelled',
    });
  
    if (mpResponse.body.status !== 'cancelled') {
      throw new Error('Falha ao cancelar a assinatura no provedor de pagamento.');
    }
  
    // O status local será atualizado pelo webhook, mas podemos forçar aqui também
    assinatura.status = 'cancelada';
    await assinatura.save();
  
    return { success: true, message: 'Assinatura cancelada com sucesso.' };
};

const listSubscribers = async () => {
    const assinaturas = await AssinaturaUsuario.findAll({
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
        { model: PlanoAssinatura, as: 'plano' },
        { model: EnderecoUsuario, as: 'enderecoEntrega' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return assinaturas;
};

const getMySubscription = async (usuarioId) => {
    const assinatura = await AssinaturaUsuario.findOne({
      where: {
        usuarioId,
      },
      include: [
        { model: PlanoAssinatura, as: 'plano' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return assinatura;
};

const processWebhook = async (webhookData) => {
    if (webhookData.type !== 'preapproval') {
        console.log('Webhook não é do tipo preapproval, ignorando.');
        return;
    }

    const subscriptionId = webhookData.data.id;
    const mpSubscription = await mercadopago.preapproval.findById(subscriptionId);

    if (!mpSubscription || !mpSubscription.body) {
        throw new Error(`Assinatura ${subscriptionId} não encontrada no Mercado Pago.`);
    }

    const subDetails = mpSubscription.body;
    const externalReference = JSON.parse(subDetails.external_reference);
    const { usuarioId, planoId, enderecoEntregaId, valorFrete, metodoFrete } = externalReference;

    const statusMap = {
        authorized: 'ativa',
        active: 'ativa',
        paused: 'pausada',
        cancelled: 'cancelada',
        pending: 'pendente',
    };
    const localStatus = statusMap[subDetails.status] || 'desconhecido';

    const [assinatura, created] = await AssinaturaUsuario.findOrCreate({
        where: { mercadoPagoSubscriptionId: subDetails.id },
        defaults: {
            usuarioId,
            planoId,
            enderecoEntregaId,
            status: localStatus,
            mercadoPagoSubscriptionId: subDetails.id,
            dataInicio: new Date(),
            // A dataFim pode ser calculada baseada na frequência do plano se necessário
        },
    });

    if (!created) {
        assinatura.status = localStatus;
        await assinatura.save();
    }

    console.log(`Assinatura ${subDetails.id} para usuário ${usuarioId} foi ${created ? 'criada' : 'atualizada'} para o status ${localStatus}.`);
};

const deletePlano = async (planoId) => {
  const contagemAssinaturas = await AssinaturaUsuario.count({
    where: { planoId },
  });

  if (contagemAssinaturas > 0) {
    throw new Error("Este plano não pode ser excluído pois possui assinantes vinculados.");
  }

  const plano = await PlanoAssinatura.findByPk(planoId);
  if (!plano) {
    throw new Error("Plano não encontrado.");
  }

  await plano.destroy();
};

module.exports = {
  createPlano,
  updatePlano,
  listPlanos,
  getPlano,
  subscribe,
  calculateShipping,
  cancelSubscription,
  listSubscribers,
  getMySubscription,
  processWebhook,
  deletePlano,
}; 