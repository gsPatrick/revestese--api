// config/melhorEnvio.js

const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config(); // ESTA LINHA É CRUCIAL E DEVE ESTAR NO TOPO DESTE ARQUIVO

// Obtém as credenciais do .env, com valores padrão de sandbox caso não estejam definidas.
const CLIENT_ID = process.env.MELHOR_ENVIO_CLIENT_ID || "17746";
const CLIENT_SECRET = process.env.MELHOR_ENVIO_CLIENT_SECRET || "fft16oWAT17WlgRI5Om6eCkRQnKAkwLp8eLR45mk";
const CONTACT_EMAIL = process.env.MELHOR_ENVIO_CONTACT_EMAIL || "contato@exemplo.com";
const USER_AGENT = `Doodle Dreams (${CONTACT_EMAIL})`;

// Variáveis para cache do token (evita múltiplas requisições de token)
let cachedToken = null;
let tokenExpiry = 0; // Armazena o timestamp de expiração do token (em milissegundos)

/**
 * Função para obter ou renovar o token de acesso do Melhor Envio.
 * Inclui um mecanismo de cache simples para evitar requisições desnecessárias.
 */
async function getAccessToken() {
  const now = Date.now();
  // Se houver um token em cache e ele expirar em mais de 5 minutos, usa o cache
  if (cachedToken && (tokenExpiry - now) > (5 * 60 * 1000)) { // 5 minutos de buffer
    return cachedToken;
  }

  try {
    const response = await axios.post(
      "https://sandbox.melhorenvio.com.br/oauth/token", // <<-- IMPORTANTE: MUDAR PARA "https://api.melhorenvio.com.br/oauth/token" EM PRODUÇÃO
      {
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        // Inclua os escopos necessários para todas as operações que você planeja realizar
        scope: "shipping-calculate shipping-checkout", // Escopos comuns para cálculo e compra de frete
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": USER_AGENT,
        },
      }
    );
    cachedToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in * 1000); // Converte segundos para milissegundos
    return cachedToken;
  } catch (error) {
    console.error("Erro ao obter token do Melhor Envio:", error.response?.data || error.message);
    throw new Error("Falha na autenticação com o Melhor Envio");
  }
}

/**
 * Cria uma instância do Axios configurada para a API do Melhor Envio,
 * incluindo o token de autenticação.
 */
async function criarMelhorEnvioClient() {
  const token = await getAccessToken(); // Obtém o token de acesso

  return axios.create({
    baseURL: "https://sandbox.melhorenvio.com.br/api/v2/me", // <<-- IMPORTANTE: MUDAR PARA "https://api.melhorenvio.com.br/api/v2/me" EM PRODUÇÃO
    headers: {
      Authorization: `Bearer ${token}`, // Utiliza o token dinamicamente obtido
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": USER_AGENT,
    },
  });
}

module.exports = criarMelhorEnvioClient;