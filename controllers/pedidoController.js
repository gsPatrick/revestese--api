// src/controllers/pedidoController.js

const pedidoService = require("../services/pedidoService")
const cupomService = require("../services/cupomService")
const freteService = require("../services/freteService")
const configuracaoLojaService = require("../services/configuracaoLojaService")
require("dotenv").config()

const pedidoController = {
 async criarPedido(req, res, next) {
    try {
      const usuarioId = req.usuario.id; // Obtido do middleware verifyToken
      // Agora extraímos diretamente 'itens', 'cupomCodigo', 'enderecoEntrega', 'freteId'
      const { itens, cupomCodigo, enderecoEntrega, freteId } = req.body; // <-- Corrigido aqui, esperando objeto enderecoEntrega

      if (!itens || itens.length === 0) {
        return res.status(400).json({ erro: "Itens do pedido são obrigatórios" });
      }

      // Calcular a quantidade total de itens para a validação do cupom
      const quantidadeTotalItens = itens.reduce((acc, item) => acc + item.quantidade, 0);

      // Verificar se todos os produtos são digitais para saber se frete é aplicável
      const { VariacaoProduto } = require("../models");
      const verificacoesDigitais = await Promise.all(itens.map(async (item) => {
        if (item.variacaoId) {
          const variacao = await VariacaoProduto.findOne({
            where: { id: item.variacaoId, produtoId: item.produtoId }
          });
          return variacao?.digital || false;
        }
        return false; 
      }));
      const todosDigitais = verificacoesDigitais.every(isDigital => isDigital);

      // Se NÃO for totalmente digital, freteId e enderecoEntrega devem estar presentes.
      if (!todosDigitais) {
          if (!enderecoEntrega) {
              return res.status(400).json({ erro: "Endereço de entrega é obrigatório para produtos físicos." });
          }
           if (!freteId) {
              return res.status(400).json({ erro: "Método de frete é obrigatório para produtos físicos." });
           }
      }

      // Validar cupom se fornecido (agora com total e quantidade de itens)
      if (cupomCodigo) {
        // Para esta validação inicial, podemos passar 0 para o total, já que o total real será calculado no service
        // ou você pode fazer um cálculo simples aqui para a primeira validação se quiser uma resposta mais rápida para o usuário.
        // No entanto, o `pedidoService.criarPedido` já faz a validação completa antes de aplicar.
        // Se a ideia é uma pré-validação, você pode fazer uma chamada aqui.
        // Para manter a robustez da validação única no service, vamos apenas garantir que o código existe.
        try {
          // A validação completa com total e quantidade será feita dentro de pedidoService.criarPedido
          // A validação do `cupomService.validarCupom` é para ser chamada com `totalPedido`, `quantidadeItens` e `usuarioId`.
          // Se o seu frontend já fez uma validação prévia ao mostrar o desconto, essa chamada aqui pode ser mais simples
          // ou até removida se a validação principal for no serviço de pedido.
        } catch (error) {
          return res.status(400).json({ erro: "Cupom inválido: " + error.message });
        }
      }

      // Criar pedido com todas as informações
      const resultado = await pedidoService.criarPedido(
        usuarioId, 
        itens, 
        enderecoEntrega, 
        todosDigitais ? null : freteId, // Frete ID do body (null se digital)
        cupomCodigo // O cupomCodigo será validado e aplicado internamente no service
      );

      res.status(201).json(resultado);
    } catch (error) {
      console.error("Erro no controlador criarPedido:", error); 
      if (error.message.includes("Estoque insuficiente") || error.message.includes("Cupom inválido") || error.message.includes("não encontrado")) {
           return res.status(400).json({ erro: error.message });
      }
      next(error); 
    }
  },

  async atualizarStatus(req, res, next) {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!status) {
        return res.status(400).json({ erro: "Status é obrigatório" })
      }

      const pedido = await pedidoService.atualizarStatusPedido(id, status)
      res.json(pedido)
    } catch (error) {
      next(error)
    }
  },

  async cancelarPedido(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.usuario.id

      // Verificar se o pedido pertence ao usuário (exceto admin)
      if (req.usuario.tipo !== "admin") {
        const pedidoExistente = await pedidoService.buscarPedidoPorId(id)
        if (!pedidoExistente || pedidoExistente.usuarioId !== usuarioId) {
          return res.status(403).json({ erro: "Acesso negado" })
        }
      }

      const pedido = await pedidoService.cancelarPedido(id)
      res.json(pedido)
    } catch (error) {
      next(error)
    }
  },

  async listarPedidosAdmin(req, res, next) {
    try {
      const pedidos = await pedidoService.listarPedidos(null, req.query);
      res.json(pedidos);
    } catch (error) {
      next(error);
    }
  },

  async listarPedidosCliente(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const pedidos = await pedidoService.listarPedidos(usuarioId, req.query);
      res.json(pedidos);
    } catch (error) {
      next(error);
    }
  },

  async buscarPedido(req, res, next) {
    try {
      const { id } = req.params
      const pedido = await pedidoService.buscarPedidoPorId(id)

      // Verificar se o pedido pertence ao usuário (exceto admin)
      if (req.usuario.tipo !== "admin" && (!pedido || pedido.usuarioId !== req.usuario.id)) {
        return res.status(403).json({ erro: "Acesso negado" })
      }

      res.json(pedido)
    } catch (error) {
      next(error)
    }
  },

  async adicionarNotaInterna(req, res, next) {
    try {
      const { id } = req.params
      const { nota } = req.body
      const pedido = await pedidoService.buscarPedidoPorId(id)
      if (!pedido) {
          return res.status(404).json({ erro: "Pedido não encontrado" });
      }
      pedido.obsInterna = nota
      await pedido.save()
      res.json(pedido)
    } catch (error) {
      next(error)
    }
  },

  async gerarEtiqueta(req, res, next) {
    try {
      const { id } = req.params
      const pedido = await pedidoService.buscarPedidoPorId(id)
      if (!pedido) {
          return res.status(404).json({ erro: "Pedido não encontrado" });
      }
      const enderecoDestino = pedido.enderecoEntrega
      const enderecoOrigem = await configuracaoLojaService.obterEnderecoOrigem()

      // Validação para garantir que o endereço de origem está configurado
      if (!enderecoOrigem || !enderecoOrigem.cep) {
        throw new Error("Endereço de origem não configurado no sistema. Por favor, configure os dados da loja no painel de administração.");
      }

      const etiqueta = await freteService.gerarEtiqueta(id, enderecoOrigem, enderecoDestino, pedido.itens)
      res.json(etiqueta)
    } catch (error) {
      next(error)
    }
  },

  async comprarEtiqueta(req, res, next) {
    try {
      const { etiquetaId } = req.body
      if (!etiquetaId) {
        return res.status(400).json({ erro: "O ID da etiqueta é obrigatório." })
      }
      
      const resultado = await freteService.comprarEtiqueta([etiquetaId])
      
      // Aqui, você pode querer salvar o código de rastreio no seu pedido
      // Ex: await pedidoService.salvarRastreio(pedidoId, resultado.tracking);
      
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async imprimirEtiqueta(req, res, next) {
    try {
      const { etiquetaId } = req.body
      if (!etiquetaId) {
        return res.status(400).json({ erro: "O ID da etiqueta é obrigatório." })
      }
      
      const pdf = await freteService.imprimirEtiqueta([etiquetaId])
      
      res.set(pdf.headers);
      res.send(pdf.data);

    } catch (error) {
      next(error)
    }
  },

  async obterDownloadsUsuario(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const downloads = await pedidoService.obterDownloadsPorUsuario(usuarioId);
      res.status(200).json(downloads);
    } catch (error) {
      next(error);
    }
  },
}

module.exports = pedidoController;