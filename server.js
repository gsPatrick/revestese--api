const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require('dotenv').config();

const { sequelize } = require("./config/database")
const tratarErros = require("./middleware/tratarErros")
const swaggerUi = require('swagger-ui-express');

const path = require("path")
// Importar rotas
const authRoutes = require("./routes/authRoutes")
const produtoRoutes = require("./routes/produtoRoutes")
const pedidoRoutes = require("./routes/pedidoRoutes")
const carrinhoRoutes = require("./routes/carrinhoRoutes")
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

const app = express()

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
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 100 requests por IP
})
app.use(limiter)

// Middleware para parsing
app.use(express.json({ limit: "500mb" }))
app.use(express.urlencoded({ extended: true, limit: "500mb" }))
app.set('trust proxy', 1)
// Rotas
app.use("/api/auth", authRoutes)
app.use("/api/produtos", produtoRoutes)
app.use("/api/pedidos", pedidoRoutes)
app.use("/api/carrinho", carrinhoRoutes)
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

// Servir arquivos estáticos da pasta uploads
app.use("/uploads", express.static("uploads"))

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
      await sequelize.sync()
      console.log("Modelos sincronizados com o banco de dados.")
    } catch (syncError) {
      console.error("Erro ao sincronizar modelos:", syncError)
    }

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`)
    })
  } catch (error) {
    console.error("Erro ao conectar com banco de dados:", error)
  }
}

// Iniciar servidor
iniciarServidor();
