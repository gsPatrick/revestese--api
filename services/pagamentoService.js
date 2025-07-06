const mercadopago = require("../config/mercadoPago")
const { Pagamento, Pedido, Usuario, AssinaturaUsuario } = require("../models")
const pedidoService = require("./pedidoService")

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
  
  // Calcula o offset em minutos e converte para o formato correto
  const offset = -date.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(offset) / 60)
  const offsetMinutes = Math.abs(offset) % 60
  const offsetSign = offset >= 0 ? '-' : '+'
  const offsetFormatted = `${offsetSign}${pad(offsetHours)}:${pad(offsetMinutes)}`
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${offsetFormatted}`
}

const pagamentoService = {
  async criarCheckoutPro(pedidoId, usuarioId) {
    try {
      const pedido = await Pedido.findOne({
        where: { id: pedidoId, usuarioId },
        include: [{ model: Usuario }],
      })

      if (!pedido) {
        throw new Error("Pedido não encontrado")
      }

      if (pedido.status !== "pendente") {
        throw new Error("Pedido já foi processado")
      }

      // Montar itens para a preferência
      const items = pedido.itens.map((item) => ({
        id: item.produtoId.toString(),
        title: item.nome,
        unit_price: Number.parseFloat(item.preco),
        quantity: item.quantidade,
        category_id: "virtual_goods", // ou outra categoria apropriada
      }));

      // Adicionar o frete como um item, se houver
      if (pedido.valorFrete && pedido.valorFrete > 0) {
        items.push({
          id: "frete",
          title: "Custo de Envio",
          unit_price: Number.parseFloat(pedido.valorFrete),
          quantity: 1,
          category_id: "shipping_and_handling",
        });
      }

      // Criar preferência no Mercado Pago
      const preference = {
        items,
        payer: {
          name: pedido.Usuario.nome,
          email: pedido.Usuario.email,
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pagamento/sucesso?pedido=${pedidoId}`,
          failure: `${process.env.FRONTEND_URL}/pagamento/erro?pedido=${pedidoId}`,
          pending: `${process.env.FRONTEND_URL}/pagamento/pendente?pedido=${pedidoId}`,
        },
        auto_return: "approved",
        external_reference: pedidoId.toString(),
        notification_url: `${process.env.URL + '/api/pagamentos/webhook' || "http://localhost:3035"}/api/pagamentos/webhook`,
        statement_descriptor: "ECOMMERCE",
        expires: true,
        expiration_date_from: formatDateToPreference(new Date()),
        expiration_date_to: formatDateToPreference(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 horas
      }

      const response = await mercadopago.preferences.create(preference)

      // Salvar dados do pagamento
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
      console.error("Erro ao criar checkout:", error)
      throw error
    }
  },

  async processarWebhook(dados) {
    try {
      const { type, data, action } = dados;

      if (type === "payment") {
        const paymentId = data.id

        // Buscar informações do pagamento no Mercado Pago
        const payment = await mercadopago.payment.findById(paymentId)
        const paymentData = payment.body

        const pedidoId = paymentData.external_reference

        if (!pedidoId) {
          console.log("Webhook sem external_reference")
          return
        }

        // Buscar pagamento no banco
        const pagamento = await Pagamento.findOne({
          where: { pedidoId },
          include: [{ model: Pedido }],
        })

        if (!pagamento) {
          console.log(`Pagamento não encontrado para pedido ${pedidoId}`)
          return
        }

        // Atualizar status do pagamento
        let novoStatus = "pendente"

        switch (paymentData.status) {
          case "approved":
            novoStatus = "aprovado"
            break
          case "rejected":
            novoStatus = "rejeitado"
            break
          case "cancelled":
            novoStatus = "cancelado"
            break
          case "pending":
          case "in_process":
            novoStatus = "pendente"
            break
        }

        await pagamento.update({
          status: novoStatus,
          dadosTransacao: paymentData,
        })

        // Atualizar status do pedido
        if (novoStatus === "aprovado") {
          await pedidoService.atualizarStatusPedido(pedidoId, "pago")
        } else if (novoStatus === "rejeitado" || novoStatus === "cancelado") {
          await pedidoService.cancelarPedido(pedidoId)
        }

        console.log(`Pagamento ${paymentId} atualizado para ${novoStatus}`)
      } else if (type === "preapproval") {
        const preapprovalId = data.id;
        console.log(`Recebido webhook de assinatura: ${preapprovalId}, Ação: ${action}`);

        // Buscar dados da assinatura no Mercado Pago
        const mpSubscription = await mercadopago.preapproval.findById(preapprovalId);
        const subData = mpSubscription.body;

        const getInternalStatus = (mpStatus) => {
          switch (mpStatus) {
            case 'authorized': return 'ativa';
            case 'paused': return 'pausada';
            case 'cancelled': return 'cancelada';
            default: return 'pendente'; // ou 'inadimplente' dependendo da lógica de negócio
          }
        };

        const internalStatus = getInternalStatus(subData.status);

        const externalReference = JSON.parse(subData.external_reference);
        const { planoId, usuarioId, enderecoEntregaId, valorFrete, metodoFrete } = externalReference;

        // Verificar se a assinatura já existe no nosso banco
        let assinatura = await AssinaturaUsuario.findOne({ where: { mercadoPagoSubscriptionId: preapprovalId } });

        if (assinatura) {
          // Atualiza o status de uma assinatura existente
          assinatura.status = internalStatus;
          assinatura.dataProximoCobranca = subData.next_payment_date;
          await assinatura.save();
          console.log(`Assinatura ${preapprovalId} atualizada para status ${assinatura.status}`);
        } else {
          // Cria uma nova assinatura se for um evento de criação e estiver autorizada
          if (internalStatus === 'ativa') {
            assinatura = await AssinaturaUsuario.create({
              usuarioId,
              planoId,
              enderecoEntregaId,
              mercadoPagoSubscriptionId: preapprovalId,
              status: 'ativa',
              dataProximoCobranca: subData.next_payment_date,
              valorFrete,
              metodoFrete,
            });
            console.log(`Nova assinatura ${preapprovalId} criada com sucesso.`);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao processar webhook:", error)
      throw error
    }
  },

  async verificarStatusPagamento(pedidoId) {
    try {
      const pagamento = await Pagamento.findOne({
        where: { pedidoId },
        include: [{ model: Pedido }],
      })

      if (!pagamento) {
        throw new Error("Pagamento não encontrado")
      }

      // Verificar status atual no Mercado Pago
      if (pagamento.transacaoId) {
        try {
          const payment = await mercadopago.payment.findById(pagamento.transacaoId)
          const paymentData = payment.body

          let statusAtualizado = pagamento.status

          switch (paymentData.status) {
            case "approved":
              statusAtualizado = "aprovado"
              break
            case "rejected":
              statusAtualizado = "rejeitado"
              break
            case "cancelled":
              statusAtualizado = "cancelado"
              break
          }

          if (statusAtualizado !== pagamento.status) {
            await pagamento.update({ status: statusAtualizado })
          }
        } catch (mpError) {
          console.error("Erro ao verificar status no MP:", mpError)
        }
      }

      return pagamento
    } catch (error) {
      throw error
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
