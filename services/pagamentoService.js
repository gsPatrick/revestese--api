const mercadopago = require("../config/mercadoPago")
const { Pagamento, Pedido, Usuario, AssinaturaUsuario } = require("../models")
const pedidoService = require("./pedidoService")
const facebookCapiService = require("./facebookCapiService"); // <-- NOVO: Importe o novo serviço

// Helper para formatar datas em ISO com offset para MercadoPago
function formatDateToPreference(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const padMs = (n) => String(n).padStart(3, '0')
  
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  const ms = padMs(date.getMilliseconds())
  
  const offset = -date.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(offset) / 60)
  const offsetMinutes = Math.abs(offset) % 60
  const offsetSign = offset >= 0 ? '-' : '+'
  const offsetFormatted = `${offsetSign}${pad(offsetHours)}:${pad(offsetMinutes)}`
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${offsetFormatted}`
}

const pagamentoService = {
  async criarCheckoutPro(pedidoId, usuarioId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[MP CHECKOUT] ▶ Criando preferência | Pedido #${pedidoId} | Usuário #${usuarioId}`);
    try {
      const pedido = await Pedido.findOne({
        where: { id: pedidoId, usuarioId },
        include: [{ model: Usuario }],
      })

      if (!pedido) {
        console.error(`[MP CHECKOUT] ❌ Pedido #${pedidoId} não encontrado`);
        throw new Error("Pedido não encontrado")
      }

      if (pedido.status !== "pendente") {
        console.warn(`[MP CHECKOUT] ⚠️  Pedido #${pedidoId} já foi processado (status: ${pedido.status})`);
        throw new Error("Pedido já foi processado")
      }

      console.log(`[MP CHECKOUT]   Cliente: ${pedido.Usuario?.nome} (${pedido.Usuario?.email})`);
      console.log(`[MP CHECKOUT]   Total: R$ ${parseFloat(pedido.total).toFixed(2)} | Frete: R$ ${parseFloat(pedido.valorFrete || 0).toFixed(2)}`);

      const items = pedido.itens.map((item) => ({
        id: item.produtoId.toString(),
        title: item.nome,
        unit_price: Number.parseFloat(item.preco),
        quantity: item.quantidade,
        category_id: "virtual_goods",
      }));

      if (pedido.valorFrete && pedido.valorFrete > 0) {
        items.push({
          id: "frete",
          title: "Custo de Envio",
          unit_price: Number.parseFloat(pedido.valorFrete),
          quantity: 1,
          category_id: "shipping_and_handling",
        });
      }

      const preference = {
        items,
        payer: {
          name: pedido.Usuario.nome,
          email: pedido.Usuario.email,
        },
        back_urls: {
          success: `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/pagamento/sucesso?pedido=${pedidoId}`,
          failure: `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/pagamento/erro?pedido=${pedidoId}`,
          pending: `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/pagamento/pendente?pedido=${pedidoId}`,
        },
        auto_return: "approved",
        external_reference: pedidoId.toString(),
        notification_url: `${(process.env.URL || "http://localhost:3035").replace(/\/$/, '')}/api/pagamentos/webhook`,
        statement_descriptor: "ECOMMERCE",
        expires: true,
        expiration_date_from: formatDateToPreference(new Date()),
        expiration_date_to: formatDateToPreference(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      }

      console.log(`[MP CHECKOUT]   notification_url: ${preference.notification_url}`);
      console.log(`[MP CHECKOUT]   back_urls: ${JSON.stringify(preference.back_urls)}`);
      console.log(`[MP CHECKOUT]   Itens: ${preference.items.map(i => `"${i.title}" x${i.quantity} R$${i.unit_price}`).join(' | ')}`);
      console.log(`[MP CHECKOUT]   Enviando para MercadoPago...`);

      const response = await mercadopago.preferences.create(preference)

      console.log(`[MP CHECKOUT] ✅ Preferência criada | ID: ${response.body.id}`);
      console.log(`[MP CHECKOUT]   checkout URL: ${response.body.init_point}`);
      console.log(`${'='.repeat(60)}\n`);

      await Pagamento.create({
        pedidoId,
        usuarioId,
        valor: pedido.total,
        metodo: "mercado_pago",
        status: "pendente",
        transacaoId: response.body.id,
        dadosTransacao: response.body,
      })

      return {
        checkoutUrl: response.body.init_point,
        preferenceId: response.body.id,
        sandboxUrl: response.body.sandbox_init_point,
      }
    } catch (error) {
      console.error(`[MP CHECKOUT] ❌ ERRO ao criar checkout:`, error.message || error);
      console.log(`${'='.repeat(60)}\n`);
      throw error
    }
  },

  async processarWebhook(dados) {
    const line = '*'.repeat(60);
    console.log(`\n${line}`);
    console.log(`[WEBHOOK] ▶ Recebido | type: ${dados.type} | action: ${dados.action || 'n/a'}`);
    console.log(`[WEBHOOK]   Payload raw: ${JSON.stringify(dados)}`);
    try {
      const { type, data } = dados;

      if (type === "payment") {
        const paymentId = data?.id;
        console.log(`[WEBHOOK]   payment_id: ${paymentId} — consultando MercadoPago...`);

        const payment = await mercadopago.payment.findById(paymentId);
        const paymentData = payment.body;

        console.log(`[WEBHOOK]   MP status: "${paymentData.status}" | detail: "${paymentData.status_detail}"`);
        console.log(`[WEBHOOK]   Valor: R$ ${paymentData.transaction_amount} | Método: ${paymentData.payment_type_id}/${paymentData.payment_method_id}`);
        console.log(`[WEBHOOK]   Pagador: ${paymentData.payer?.email || 'n/a'}`);
        console.log(`[WEBHOOK]   external_reference (pedidoId): ${paymentData.external_reference}`);

        const pedidoId = paymentData.external_reference;

        if (!pedidoId) {
          console.warn(`[WEBHOOK] ⚠️  Nenhum external_reference — ignorando`);
          console.log(`${line}\n`);
          return;
        }

        const pagamento = await Pagamento.findOne({
          where: { pedidoId },
          include: [{ model: Pedido, include: [{ model: Usuario }] }],
        });

        if (!pagamento) {
          console.warn(`[WEBHOOK] ⚠️  Nenhum registro de Pagamento para pedido #${pedidoId}`);
          console.log(`${line}\n`);
          return;
        }

        console.log(`[WEBHOOK]   Pagamento DB #${pagamento.id} | status atual: "${pagamento.status}"`);

        const MP_STATUS_MAP = {
          approved:   'aprovado',
          rejected:   'rejeitado',
          cancelled:  'cancelado',
          pending:    'pendente',
          in_process: 'pendente',
        };
        const novoStatus = MP_STATUS_MAP[paymentData.status] || 'pendente';
        console.log(`[WEBHOOK]   Mapeando "${paymentData.status}" → "${novoStatus}"`);

        await pagamento.update({ status: novoStatus, dadosTransacao: paymentData });

        if (novoStatus === "aprovado") {
          console.log(`[WEBHOOK] ✅ APROVADO — atualizando pedido #${pedidoId} para "pago"`);
          await pedidoService.atualizarStatusPedido(pedidoId, "pago");
          if (pagamento.Pedido?.Usuario) {
            console.log(`[WEBHOOK]   Disparando Facebook CAPI para pedido #${pedidoId}`);
            facebookCapiService.sendPurchaseEvent(pagamento.Pedido, pagamento.Pedido.Usuario);
          } else {
            console.warn(`[WEBHOOK]   Facebook CAPI: dados do usuário indisponíveis para pedido #${pedidoId}`);
          }
        } else if (novoStatus === "rejeitado" || novoStatus === "cancelado") {
          console.log(`[WEBHOOK] ❌ ${novoStatus.toUpperCase()} — cancelando pedido #${pedidoId}`);
          await pedidoService.cancelarPedido(pedidoId);
        } else {
          console.log(`[WEBHOOK] ⏳ Pagamento "${novoStatus}" — nenhuma ação no pedido`);
        }

        console.log(`[WEBHOOK] ✔ Concluído | payment #${paymentId} → "${novoStatus}"`);
      } else {
        console.log(`[WEBHOOK]   Tipo "${type}" não tratado — ignorando`);
      }

      console.log(`${line}\n`);
    } catch (error) {
      console.error(`[WEBHOOK] ❌ ERRO: ${error.message}`);
      if (error.cause) console.error(`[WEBHOOK]   cause:`, JSON.stringify(error.cause));
      console.log(`${'*'.repeat(60)}\n`);
      throw error;
    }
  },

  async verificarStatusPagamento(pedidoId) {
    console.log(`[SYNC] Verificando pagamento para pedido #${pedidoId}...`);
    try {
      const pagamento = await Pagamento.findOne({
        where: { pedidoId },
        include: [{ model: Pedido }],
      });

      if (!pagamento) throw new Error("Pagamento não encontrado");

      console.log(`[SYNC]   transacaoId: ${pagamento.transacaoId} | status DB: ${pagamento.status}`);

      if (pagamento.transacaoId) {
        try {
          const payment = await mercadopago.payment.findById(pagamento.transacaoId);
          const paymentData = payment.body;
          console.log(`[SYNC]   MP retornou status: "${paymentData.status}"`);

          const MP_STATUS_MAP = { approved: 'aprovado', rejected: 'rejeitado', cancelled: 'cancelado' };
          const statusAtualizado = MP_STATUS_MAP[paymentData.status] || pagamento.status;

          if (statusAtualizado !== pagamento.status) {
            console.log(`[SYNC]   Atualizando: "${pagamento.status}" → "${statusAtualizado}"`);
            await pagamento.update({ status: statusAtualizado, dadosTransacao: paymentData });
            if (statusAtualizado === 'aprovado') {
              await pedidoService.atualizarStatusPedido(pagamento.pedidoId, 'pago');
            } else if (statusAtualizado === 'rejeitado' || statusAtualizado === 'cancelado') {
              try { await pedidoService.cancelarPedido(pagamento.pedidoId); } catch (_) {}
            }
          } else {
            console.log(`[SYNC]   Sem mudança — status já é "${statusAtualizado}"`);
          }
        } catch (mpError) {
          console.error(`[SYNC]   Erro ao consultar MP: ${mpError.message}`);
        }
      } else {
        console.log(`[SYNC]   Sem transacaoId numérico — pulando consulta MP`);
      }

      return pagamento;
    } catch (error) {
      console.error(`[SYNC] ❌ ERRO: ${error.message}`);
      throw error;
    }
  },

  async listarPagamentos(filtros = {}) {
    try {
      const { usuarioId, status, page = 1, limit = 10 } = filtros
      const where = {}

      if (usuarioId) where.usuarioId = usuarioId
      if (status) where.status = status

      const offset = (page - 1) * limit

      const { count, rows } = await Pagamento.findAndCountAll({
        where,
        include: [{ model: Pedido }, { model: Usuario, attributes: ["nome", "email"] }],
        limit: Number.parseInt(limit),
        offset,
        order: [["createdAt", "DESC"]],
      })

      return {
        pagamentos: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number.parseInt(page),
      }
    } catch (error) {
      throw error
    }
  },
}

module.exports = pagamentoService