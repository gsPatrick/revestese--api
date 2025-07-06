const { enviarEmail } = require("../utils/email")
const { Pedido, Usuario, Produto } = require("../models")

const notificacaoService = {
  async enviarConfirmacaoPedido(pedidoId) {
    try {
      const pedido = await Pedido.findByPk(pedidoId, {
        include: [{ model: Usuario }],
      })

      if (!pedido) {
        throw new Error("Pedido não encontrado")
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Pedido Confirmado!</h1>
          <p>Olá <strong>${pedido.Usuario.nome}</strong>,</p>
          <p>Seu pedido <strong>#${pedido.id}</strong> foi confirmado com sucesso!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalhes do Pedido:</h3>
            <p><strong>Número:</strong> #${pedido.id}</p>
            <p><strong>Total:</strong> R$ ${pedido.total}</p>
            <p><strong>Status:</strong> ${pedido.status}</p>
            <p><strong>Data:</strong> ${new Date(pedido.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>

          <h3>Itens do Pedido:</h3>
          <ul>
            ${pedido.itens
              .map(
                (item) => `
              <li>${item.nome} - Qtd: ${item.quantidade} - R$ ${item.preco}</li>
            `,
              )
              .join("")}
          </ul>

          <p>Você receberá uma nova notificação quando seu pedido for enviado.</p>
          <p>Obrigado por comprar conosco!</p>
        </div>
      `

      await enviarEmail(pedido.Usuario.email, `Pedido #${pedido.id} Confirmado`, html)

      return { message: "Email de confirmação enviado" }
    } catch (error) {
      console.error("Erro ao enviar confirmação:", error)
      throw error
    }
  },

  async enviarAtualizacaoStatus(pedidoId, novoStatus) {
    try {
      const pedido = await Pedido.findByPk(pedidoId, {
        include: [{ model: Usuario }],
      })

      if (!pedido) {
        throw new Error("Pedido não encontrado")
      }

      const statusMessages = {
        pago: "foi confirmado e está sendo processado",
        processando: "está sendo preparado para envio",
        enviado: "foi enviado e está a caminho",
        entregue: "foi entregue com sucesso",
        cancelado: "foi cancelado",
      }

      const message = statusMessages[novoStatus] || "teve seu status atualizado"

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Atualização do Pedido #${pedido.id}</h1>
          <p>Olá <strong>${pedido.Usuario.nome}</strong>,</p>
          <p>Seu pedido <strong>#${pedido.id}</strong> ${message}.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Status Atual:</h3>
            <p style="font-size: 18px; color: #059669;"><strong>${novoStatus.toUpperCase()}</strong></p>
            <p><strong>Data da atualização:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
          </div>

          ${
            novoStatus === "enviado"
              ? `
            <p>Seu pedido foi enviado! Você receberá o código de rastreamento em breve.</p>
          `
              : ""
          }

          ${
            novoStatus === "entregue"
              ? `
            <p>Esperamos que você esteja satisfeito com sua compra!</p>
            <p>Não se esqueça de avaliar os produtos que você comprou.</p>
          `
              : ""
          }

          <p>Obrigado por comprar conosco!</p>
        </div>
      `

      await enviarEmail(pedido.Usuario.email, `Pedido #${pedido.id} - Status Atualizado: ${novoStatus}`, html)

      return { message: "Email de atualização enviado" }
    } catch (error) {
      console.error("Erro ao enviar atualização:", error)
      throw error
    }
  },

  async enviarAlertaEstoqueBaixo(produtoId) {
    try {
      const produto = await Produto.findByPk(produtoId)
      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      // Buscar variação principal para mostrar estoque
      const variacoes = await produto.getVariacoes({ where: { ativo: true }, order: [['id', 'ASC']] });
      const estoque = variacoes.length > 0 ? variacoes[0].estoque : 0;

      // Buscar email do admin (pode ser configurável)
      const adminEmail = process.env.ADMIN_EMAIL || "admin@ecommerce.com"

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #EF4444;">⚠️ Alerta de Estoque Baixo</h1>
          <p>O produto <strong>${produto.nome}</strong> está com estoque baixo!</p>
          <p><strong>Estoque Atual (primeira variação):</strong> ${estoque} unidades</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <h3>Detalhes do Produto:</h3>
            <p><strong>Nome:</strong> ${produto.nome}</p>
            <p><strong>ID:</strong> ${produto.id}</p>
            <p><strong>Categoria:</strong> ${produto.categoria}</p>
          </div>

          <p>Recomendamos reabastecer o estoque o quanto antes.</p>
        </div>
      `

      await enviarEmail(adminEmail, `Estoque Baixo: ${produto.nome}`, html)

      return { message: "Alerta de estoque enviado" }
    } catch (error) {
      console.error("Erro ao enviar alerta de estoque:", error)
      throw error
    }
  },

  async enviarBoasVindas(usuarioId) {
    try {
      const usuario = await Usuario.findByPk(usuarioId)
      if (!usuario) {
        throw new Error("Usuário não encontrado")
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Bem-vindo à nossa loja!</h1>
          <p>Olá <strong>${usuario.nome}</strong>,</p>
          <p>Seja muito bem-vindo à nossa loja! Estamos felizes em tê-lo conosco.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>O que você pode fazer agora:</h3>
            <ul>
              <li>Explorar nossos produtos</li>
              <li>Adicionar itens aos favoritos</li>
              <li>Configurar seu endereço de entrega</li>
              <li>Aproveitar nossas promoções</li>
            </ul>
          </div>

          <p>Se tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
          <p>Boas compras!</p>
        </div>
      `

      await enviarEmail(usuario.email, "Bem-vindo à nossa loja!", html)

      return { message: "Email de boas-vindas enviado" }
    } catch (error) {
      console.error("Erro ao enviar boas-vindas:", error)
      throw error
    }
  },
}

module.exports = notificacaoService
