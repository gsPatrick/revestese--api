const axios = require('axios');
const crypto = require('crypto');

// --- DADOS HARDCODED PARA TESTE ---
// !! SUBSTITUA PELOS SEUS DADOS REAIS !!
const PIXEL_ID = "SEU_ID_DO_PIXEL_AQUI";
const ACCESS_TOKEN = "SEU_TOKEN_DE_ACESSO_DA_API_DE_CONVERSOES_AQUI";
const TEST_EVENT_CODE = "SEU_CODIGO_DE_TESTE_AQUI"; // Pegue no Gerenciador de Eventos do Facebook. Remova esta linha em produção.
// ------------------------------------


// Função para criar o hash SHA-256 exigido pelo Facebook
function hashData(data) {
  if (!data) return null;
  // O e-mail deve ser em minúsculas e sem espaços antes e depois
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
}

const facebookCapiService = {
  /**
   * Envia um evento de Compra (Purchase) para a API de Conversões do Facebook.
   * @param {object} pedido - O objeto Pedido do seu model.
   * @param {object} usuario - O objeto Usuario do seu model.
   */
  async sendPurchaseEvent(pedido, usuario) {
    try {
      console.log(`Facebook CAPI: Preparando evento de Purchase para o pedido #${pedido.id}`);

      const eventData = {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000), // Timestamp UNIX em segundos
        action_source: "website",
        user_data: {
          em: [hashData(usuario.email)], // Email do usuário hasheado
        },
        custom_data: {
          value: parseFloat(pedido.total), // O valor total do pedido
          currency: "BRL", // Sua moeda
        },
        event_id: `pedido_${pedido.id}` // ID para desduplicação
      };

      const payload = {
        data: [eventData],
        // Usando o código de teste hardcoded. Comente ou remova para produção.
        test_event_code: TEST_EVENT_CODE
      };

      const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

      // Envia o evento para o Facebook
      axios.post(url, payload).catch(err => {
        console.error("Facebook CAPI: Erro ao enviar evento.", err.response?.data || err.message);
      });

      console.log(`Facebook CAPI: Evento de Purchase para o pedido #${pedido.id} enviado para a fila.`);

    } catch (error) {
      console.error("Facebook CAPI: Erro ao montar o payload do evento.", error);
    }
  }
};

module.exports = facebookCapiService;