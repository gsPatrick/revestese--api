const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const CLIENT_ID = process.env.MELHOR_ENVIO_CLIENT_ID || "17746";
const CLIENT_SECRET = process.env.MELHOR_ENVIO_CLIENT_SECRET || "fft16oWAT17WlgRI5Om6eCkRQnKAkwLp8eLR45mk";
// Adicione seu e-mail de contato no arquivo .env ou diretamente aqui
const CONTACT_EMAIL = process.env.MELHOR_ENVIO_CONTACT_EMAIL || "contato@doodledreams.com.br";
const USER_AGENT = `Doodle Dreams (${CONTACT_EMAIL})`;

// Função para obter o token de acesso usando client_id e client_secret
async function obterTokenMelhorEnvio() {
  try {
    const response = await axios.post(
      "https://sandbox.melhorenvio.com.br/oauth/token",
      {
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "shipping-calculate", // Escopo mínimo para cálculo de frete
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Erro ao obter token do Melhor Envio:", error.response?.data || error.message);
    throw new Error("Falha na autenticação com o Melhor Envio");
  }
}

// Cria uma instância do axios com o token dinâmico
async function criarMelhorEnvioClient() {
  const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NTYiLCJqdGkiOiIwN2IwMzBmMGY3ZDZmZTQ2MzgxYjA1ZjQyNTBjYjk3NmEzYjhjZjk3YWQ5ZmNiYWMzYTQzMzczMDY4MDIxOGI1YmM1MzA5NDI4ZTQyMGMwZCIsImlhdCI6MTc1MDI2MDY5NC4zMTc3MzMsIm5iZiI6MTc1MDI2MDY5NC4zMTc3MzcsImV4cCI6MTc4MTc5NjY5NC4zMDgyODQsInN1YiI6IjlmMTNkM2EyLTgyNTItNDQ0MS1hMGNlLTVlZGVmZTNhMjU5MCIsInNjb3BlcyI6WyJjYXJ0LXJlYWQiLCJjYXJ0LXdyaXRlIiwiY29tcGFuaWVzLXJlYWQiLCJjb21wYW5pZXMtd3JpdGUiLCJjb3Vwb25zLXJlYWQiLCJjb3Vwb25zLXdyaXRlIiwibm90aWZpY2F0aW9ucy1yZWFkIiwib3JkZXJzLXJlYWQiLCJwcm9kdWN0cy1yZWFkIiwicHJvZHVjdHMtZGVzdHJveSIsInByb2R1Y3RzLXdyaXRlIiwicHVyY2hhc2VzLXJlYWQiLCJzaGlwcGluZy1jYWxjdWxhdGUiLCJzaGlwcGluZy1jYW5jZWwiLCJzaGlwcGluZy1jaGVja291dCIsInNoaXBwaW5nLWNvbXBhbmllcyIsInNoaXBwaW5nLWdlbmVyYXRlIiwic2hpcHBpbmctcHJldmlldyIsInNoaXBwaW5nLXByaW50Iiwic2hpcHBpbmctc2hhcmUiLCJzaGlwcGluZy10cmFja2luZyIsImVjb21tZXJjZS1zaGlwcGluZyIsInRyYW5zYWN0aW9ucy1yZWFkIiwidXNlcnMtcmVhZCIsInVzZXJzLXdyaXRlIiwid2ViaG9va3MtcmVhZCIsIndlYmhvb2tzLXdyaXRlIiwid2ViaG9va3MtZGVsZXRlIiwidGRlYWxlci13ZWJob29rIl19.cyYENc7f5Ahn1v6oo8-GlPqPlqgN8sxwKNdEsuDi1aOdvS7QW3CT4EVpdAF5WT8qZBS2YI96BpdAhoxAm8BXCpRqhr7kaUG9O1AqnZ733OvbHcF-kDGpdOVT3iDPdA2-6EUd0H9hlUnxxP7u-OAA6K2_wEvNBfCFbIrvUWT2Ekxaizd0vvbEzoQMsaRQpn3FjFtnSwEtSi4RdKp-T5tK6AeyRv1mnAJ7uFg8ZNQILgCaz06dmdJUZpxU6Egy52GfJWZGBXkixfipw6Jbprdy7ZCyeD_vYYe0Fi0gVtrDTzYEZQDNDuKcwHSKYsiV1CEOTZ3Xa839SUEmHybAJxis1eKSu9FWKkN4b7Jvvf_Pn0td93Qe83HrjjdVCvzlVN5GkWTsurOsr7HuKlX2cx7Vm9oHyaDe-I8z4PvJfvhyoLMX0CXaZn-6OYDg3KD9S6teHX7EFa0-d1zk9AUwuWj7eJUUlzcI5L5z8RKSiHM-m5uTl3YredGNVgdlGLXyoxPMim3MxQyiTtFopkDB-PyLvA9UupVyNU2CwY4vx13lyjr0kcGyJgLFWGYwVVHmLVvEZf8AIAudJpt6MvVIWwmzYYacXHX5t3T4svgbolILrCQdlj8fH8hOZ3pBRtsRDeLUOPBUP79hUnNRjyTeZxj28eKwCBlcfjgnk81VnjVMn8Y'
  return axios.create({
    baseURL: "https://sandbox.melhorenvio.com.br/api/v2/me",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
}

module.exports = criarMelhorEnvioClient;
