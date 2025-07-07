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

      // REMOVIDA A VALIDAÇÃO INCORRETA QUE ESPERAVA enderecoEntregaId
      // A validação de que enderecoEntrega é obrigatório para produtos físicos
      // e que freteId é necessário será feita DENTRO do pedidoService.criarPedido

      // Verificar se todos os produtos são digitais para saber se frete é aplicável
      const { VariacaoProduto } = require("../models");
      const verificacoesDigitais = await Promise.all(itens.map(async (item) => {
        if (item.variacaoId) {
          const variacao = await VariacaoProduto.findOne({
            where: { id: item.variacaoId, produtoId: item.produtoId }
          });
          return variacao?.digital || false;
        }
        // Suponha que produtos sem variação não são digitais, a menos que haja outro campo 'digital' no Produto
        // No seu modelo Produto, não há flag digital, então assume-se físico.
        // Se houver produtos digitais sem variação, essa lógica precisa ser ajustada.
        return false; 
      }));
      const todosDigitais = verificacoesDigitais.every(isDigital => isDigital);

      // Se NÃO for totalmente digital, freteId e enderecoEntrega devem estar presentes.
      // Vamos mover essa validação para CÁ, antes de chamar o service, para dar um erro mais específico.
      if (!todosDigitais) {
          if (!enderecoEntrega) {
              return res.status(400).json({ erro: "Endereço de entrega é obrigatório para produtos físicos." });
          }
           if (!freteId) {
              return res.status(400).json({ erro: "Método de frete é obrigatório para produtos físicos." });
           }
      }


      // Validar cupom se fornecido (mantido)
      if (cupomCodigo) {
        try {
          await cupomService.validarCupom(cupomCodigo);
        } catch (error) {
          return res.status(400).json({ erro: "Cupom inválido: " + error.message }); // Mensagem mais específica
        }
      }

      // Criar pedido com todas as informações
      const resultado = await pedidoService.criarPedido(
        usuarioId, // Usuario ID do token
        itens, // Itens do body
        enderecoEntrega, // Objeto completo de endereço DO BODY
        todosDigitais ? null : freteId, // Frete ID do body (null se digital)
        cupomCodigo
      );

      res.status(201).json(resultado);
    } catch (error) {
      console.error("Erro no controlador criarPedido:", error); // Log mais detalhado
      // Se o erro veio do service (como "Estoque insuficiente"), lance-o
      if (error.message.includes("Estoque insuficiente")) {
           return res.status(400).json({ erro: error.message });
      }
       if (error.message.includes("não encontrado")) { // Erros como Produto não encontrado
           return res.status(404).json({ erro: error.message });
      }
      // Para outros erros inesperados, retorne 500
      next(error); // Passa para o middleware de tratamento de erros padrão
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
        if (pedidoExistente.usuarioId !== usuarioId) {
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
      if (req.usuario.tipo !== "admin" && pedido.usuarioId !== req.usuario.id) {
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

module.exports = pedidoController
