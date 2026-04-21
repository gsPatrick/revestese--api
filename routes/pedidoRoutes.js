const express = require("express");
const pedidoController = require("../controllers/pedidoController");
const { verifyToken, isAdmin } = require("../middleware/auth");

const router = express.Router();

// TODAS as rotas de pedido, incluindo a de criação, requerem autenticação
router.use(verifyToken); // <<-- MANTER ESTE MIDDLEWARE AQUI

// Rotas do cliente
router.get("/meus-pedidos", pedidoController.listarPedidosCliente);
router.get("/:id", pedidoController.buscarPedido);
router.post("/", pedidoController.criarPedido); // <<-- AGORA SEMPRE EXIGE USUARIO LOGADO
router.delete("/:id", pedidoController.cancelarPedido);
router.get("/meus/downloads", pedidoController.obterDownloadsUsuario);

// Rotas de Admin
router.use(isAdmin); // A partir daqui, precisa ser admin
router.get("/", pedidoController.listarPedidosAdmin);
router.put("/:id/status", pedidoController.atualizarStatus);
router.put("/:id/rastreio", pedidoController.atualizarRastreio);
router.put("/:id/nota-interna", pedidoController.adicionarNotaInterna);
router.post("/:id/etiqueta", pedidoController.gerarEtiqueta);
router.post("/etiqueta/comprar", pedidoController.comprarEtiqueta);
router.post("/etiqueta/imprimir", pedidoController.imprimirEtiqueta);

module.exports = router;