const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require('dotenv').config();

const { sequelize } = require("./config/database")
// IMPORTANTE: Garanta que todos os modelos sejam carregados antes do sync.
// O arquivo index.js da pasta models geralmente já faz isso.
require('./models');
const bcrypt = require('bcryptjs');
const { Usuario } = require('./models');
const tratarErros = require("./middleware/tratarErros")
const swaggerUi = require('swagger-ui-express');

const path = require("path")
// Importar rotas
const authRoutes = require("./routes/authRoutes")
const produtoRoutes = require("./routes/produtoRoutes")
const pedidoRoutes = require("./routes/pedidoRoutes")
const cupomRoutes = require("./routes/cupomRoutes")
const blogRoutes = require("./routes/blogRoutes")
const downloadRoutes = require("./routes/downloadRoutes")
const freteRoutes = require("./routes/freteRoutes")
const usuarioRoutes = require("./routes/usuarioRoutes")
const categoriaRoutes = require("./routes/categoriaRoutes")
// Importar novas rotas
const enderecoRoutes = require("./routes/enderecoRoutes")
const avaliacaoRoutes = require("./routes/avaliacaoRoutes")
const pagamentoRoutes = require("./routes/pagamentoRoutes")
const uploadRoutes = require("./routes/uploadRoutes")

// Importar as novas rotas
const favoritoRoutes = require("./routes/favoritoRoutes")
const dashboardRoutes = require("./routes/dashboardRoutes")
const configuracaoLojaRoutes = require("./routes/configuracaoLojaRoutes")
const viaCepRoutes = require("./routes/viaCepRoutes")
const relatorioRoutes = require("./routes/relatorioRoutes")
const subscriptionRoutes = require("./routes/subscriptionRoutes")
const analyticsRoutes    = require("./routes/analyticsRoutes")
const videoRoutes        = require("./routes/videoRoutes")

const app = express()

// ── Webhook MercadoPago ─────────────────────────────────────────────────────
// Registrado ANTES de qualquer middleware, com CORS próprio.
app.all('/api/pagamentos/webhook', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');

  // Responde preflight imediatamente
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Processa POST em background sem bloquear a resposta
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const pagamentoService = require('./services/pagamentoService');
        pagamentoService.processarWebhook(payload).catch(() => {});
      } catch (_) {}
    });
  }

  res.status(200).json({ message: 'ok' });
});
// ───────────────────────────────────────────────────────────────────────────

// Middleware de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(cors({
  origin: "*", // Em produção, restrinja para o seu domínio
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);


// Middleware para parsing
app.use(express.json({ limit: "500mb" }))
app.use(express.urlencoded({ extended: true, limit: "500mb" }))
app.set('trust proxy', 1)
// Rotas
app.use("/api/auth", authRoutes)
app.use("/api/produtos", produtoRoutes)
app.use("/api/pedidos", pedidoRoutes)
app.use("/api/cupons", cupomRoutes)
app.use("/api/blog", blogRoutes)
app.use("/api/downloads", downloadRoutes)
app.use("/api/frete", freteRoutes)
app.use("/api/usuarios", usuarioRoutes)
app.use("/api/categorias", categoriaRoutes)
// Adicionar as rotas após as rotas existentes
app.use("/api/enderecos", enderecoRoutes)
app.use("/api/avaliacoes", avaliacaoRoutes)
app.use("/api/pagamentos", pagamentoRoutes)
app.use("/api/uploads", uploadRoutes)

// Adicionar as rotas após as rotas existentes
app.use("/api/favoritos", favoritoRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/configuracoes/loja", configuracaoLojaRoutes)
app.use("/api/cep", viaCepRoutes)
app.use("/api/relatorios", relatorioRoutes)
app.use("/api/subscriptions", subscriptionRoutes)
app.use("/api/analytics",    analyticsRoutes)
app.use("/api/admin/videos", videoRoutes)

// Servir arquivos estáticos da pasta uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Middleware de tratamento de erros
app.use(tratarErros)

// Rota de teste
app.get("/", (req, res) => {
  res.json({ message: "API Ecommerce funcionando!" })
})

// Configurar Swagger UI (serve documentação pré-gerada)
const swaggerFile = require('./swagger-output.json');
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile));

const PORT = process.env.PORT || 3001

// Inicializar servidor
async function iniciarServidor() {
  try {
    await sequelize.authenticate()
    console.clear()
    console.log("Conexão com banco de dados estabelecida.")

    try {
      await sequelize.sync({ alter: true });
      console.log("Modelos sincronizados com o banco de dados.");
    } catch (syncError) {
      console.error("Erro ao sincronizar modelos:", syncError)
    }

    await garantirAdminPadrao();

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`)
    })

    // Sync assíncrono de pagamentos pendentes (não bloqueia o start)
    sincronizarPagamentosPendentes().catch(err =>
      console.error('[Startup Sync] Erro:', err.message)
    );
  } catch (error) {
    console.error("Erro ao conectar com banco de dados:", error)
  }
}

async function sincronizarPagamentosPendentes() {
  try {
    const { Pedido, Pagamento } = require('./models');
    const pagamentoService = require('./services/pagamentoService');

    // Busca pedidos pendentes que tenham um registro de pagamento com transacaoId
    const pedidosPendentes = await Pedido.findAll({
      where: { status: 'pendente' },
      include: [{
        model: Pagamento,
        required: true,
        where: { transacaoId: { [require('sequelize').Op.ne]: null } },
      }],
    });

    if (pedidosPendentes.length === 0) {
      console.log('[Startup Sync] Nenhum pagamento pendente para sincronizar.');
      return;
    }

    console.log(`[Startup Sync] Sincronizando ${pedidosPendentes.length} pedido(s) pendente(s)...`);

    for (const pedido of pedidosPendentes) {
      try {
        await pagamentoService.verificarStatusPagamento(pedido.id);
        console.log(`[Startup Sync] Pedido #${pedido.id} sincronizado.`);
      } catch (err) {
        console.error(`[Startup Sync] Falha no pedido #${pedido.id}: ${err.message}`);
      }
      // Pequeno intervalo para não sobrecarregar a API do MP
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('[Startup Sync] Concluído.');
  } catch (err) {
    console.error('[Startup Sync] Erro geral:', err.message);
  }
}

async function garantirAdminPadrao() {
  try {
    const ADMIN_EMAIL = 'reveste-se@admin.com';
    const ADMIN_SENHA = 'admin123';

    const existe = await Usuario.findOne({ where: { email: ADMIN_EMAIL } });
    if (!existe) {
      const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);
      await Usuario.create({
        nome: 'Administrador',
        email: ADMIN_EMAIL,
        senhaHash,
        tipo: 'admin',
        ativo: true,
      });
      console.log(`Admin padrão criado: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('Erro ao garantir admin padrão:', err.message);
  }
}

// Iniciar servidor
iniciarServidor();