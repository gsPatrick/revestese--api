require('dotenv').config();
const axios = require('axios');

async function obterTokens() {
  const code = process.argv[2]; // Pega o código da linha de comando

  if (!code) {
    console.error('ERRO: Você precisa fornecer o código de autorização.');
    console.log('Uso: node scripts/obterTokens.js SEU_CODIGO_AQUI');
    process.exit(1);
  }

  try {
    console.log('Trocando código por tokens...');
    const response = await axios.post(process.env.ME_AUTH_URL, {
      grant_type: 'authorization_code',
      client_id: process.env.ME_CLIENT_ID,
      client_secret: process.env.ME_CLIENT_SECRET,
      redirect_uri: process.env.ME_REDIRECT_URI,
      code: code,
    }, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': `DoodleDreamsApp-Script (${process.env.ME_CONTACT_EMAIL})`
      }
    });

    console.log('\n--- SUCESSO! ---');
    console.log('Guarde estes valores com segurança e insira no seu banco de dados na tabela "ConfiguracaoLojas".');
    console.log('--------------------------------------------------');
    console.log('ME_ACCESS_TOKEN:', response.data.access_token);
    console.log('ME_REFRESH_TOKEN:', response.data.refresh_token);
    console.log('Expira em (segundos):', response.data.expires_in);
    console.log('--------------------------------------------------\n');
    
  } catch (error) {
    console.error('\n--- ERRO AO OBTER TOKENS ---');
    console.error(error.response?.data || error.message);
  }
}

obterTokens();