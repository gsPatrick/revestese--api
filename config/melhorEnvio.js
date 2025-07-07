const axios = require("axios");
const { ConfiguracaoLoja } = require("../models");
const configuracaoLojaService = require("../services/configuracaoLojaService");
require('dotenv').config();

const API_BASE_URL = process.env.ME_API_URL || "https://melhorenvio.com.br/api/v2";
const AUTH_URL = process.env.ME_AUTH_URL || "https://melhorenvio.com.br/oauth/token";

const CLIENT_ID = process.env.ME_CLIENT_ID;
const CLIENT_SECRET = process.env.ME_CLIENT_SECRET;
const REDIRECT_URI = process.env.ME_REDIRECT_URI;

/**
 * Esta função busca um token válido, atualizando-o se necessário.
 */
async function getValidToken() {
  const configs = await configuracaoLojaService.obterTodasConfiguracoes();
  
  let accessToken = configs.ME_ACCESS_TOKEN;
  let refreshToken = configs.ME_REFRESH_TOKEN;
  let expiresAt = configs.ME_EXPIRES_AT ? new Date(configs.ME_EXPIRES_AT) : new Date(0);

  // Se o token ainda é válido (com uma margem de segurança de 5 minutos), retorna-o.
  if (accessToken && expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return accessToken;
  }

  // Se o token expirou, usa o refresh_token para obter um novo.
  if (!refreshToken) {
    throw new Error("Refresh token do Melhor Envio não encontrado. Configure-o manualmente.");
  }

  console.log("Token do Melhor Envio expirado. Atualizando...");

  try {
    const response = await axios.post(AUTH_URL, {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // O CABEÇALHO CRUCIAL QUE ESTAVA FALTANDO:
        'User-Agent': `DoodleDreamsApp (${process.env.ADMIN_EMAIL || 'contato@doodledreams.com.br'})`
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const newExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Salva os novos tokens e a data de expiração no banco de dados
    await configuracaoLojaService.atualizarConfiguracoes({
      ME_ACCESS_TOKEN: access_token,
      ME_REFRESH_TOKEN: refresh_token,
      ME_EXPIRES_AT: newExpiresAt.toISOString(),
    });

    console.log("Token do Melhor Envio atualizado com sucesso.");
    return access_token;

  } catch (error) {
    console.error("Erro CRÍTICO ao renovar token do Melhor Envio:", error.response?.data || error.message);
    throw new Error("Falha na autenticação com o Melhor Envio");
  }
}

/**
 * Função principal que cria e retorna uma instância do Axios pré-configurada.
 */
const melhorEnvioClient = async () => {
  const token = await getValidToken();

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      // O CABEÇALHO CRUCIAL QUE ESTAVA FALTANDO:
      'User-Agent': `DoodleDreamsApp (${process.env.ADMIN_EMAIL || 'contato@doodledreams.com.br'})`
    }
  });
};

module.exports = melhorEnvioClient;