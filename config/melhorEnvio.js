// src/config/melhorEnvio.js

const axios = require("axios")
require("dotenv").config()

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
}

// Helper para obter o token de acesso
const getAccessToken = async () => {
  const now = Date.now()
  if (tokenCache.accessToken && now < tokenCache.expiresAt) {
    return tokenCache.accessToken
  }

  try {
    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", process.env.MELHOR_ENVIO_CLIENT_ID)
    params.append("client_secret", process.env.MELHOR_ENVIO_CLIENT_SECRET)
    params.append("scope", "cart-read cart-write companies-read coupons-read notifications-read products-read products-write purchases-read shipping-calculate shipping-cancel shipping-checkout shipping-companies shipping-generate shipping-preview shipping-print shipping-share shipping-tracking ecommerce-shipping transactions-read users-read webhooks-read webhooks-write")

    const response = await axios.post(
      `${process.env.MELHOR_ENVIO_API_URL}/oauth/token`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // ADIÇÃO IMPORTANTE AQUI:
          "User-Agent": "DoodleDreamsApp/1.0 (contato@doodledreams.com.br)",
        },
      },
    )

    const { access_token, expires_in } = response.data
    tokenCache = {
      accessToken: access_token,
      expiresAt: now + (expires_in - 300) * 1000, // Subtrai 5 minutos por segurança
    }

    return tokenCache.accessToken
  } catch (error) {
    console.error("Erro ao obter token do Melhor Envio:", error.response?.data || error.message)
    throw new Error("Falha na autenticação com o Melhor Envio")
  }
}

// Função principal que retorna o cliente Axios configurado
const melhorEnvioClient = async () => {
  const accessToken = await getAccessToken()

  const apiClient = axios.create({
    baseURL: process.env.MELHOR_ENVIO_API_URL,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      // ADIÇÃO IMPORTANTE AQUI TAMBÉM:
      "User-Agent": "DoodleDreamsApp/1.0 (contato@doodledreams.com.br)",
    },
  })

  return apiClient
}

module.exports = melhorEnvioClient