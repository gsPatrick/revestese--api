const freteService = require("../services/freteService")
const configuracaoLojaService = require("../services/configuracaoLojaService")

const freteController = {
  async calcular(req, res, next) {
    try {
      const { enderecoDestino, itens } = req.body

      // O endereço de origem agora é buscado do banco de dados
      const enderecoOrigem = await configuracaoLojaService.obterEnderecoOrigem()

      if (!enderecoOrigem || !enderecoOrigem.cep) {
        return res.status(500).json({
          erro: "Endereço de origem da loja não configurado."
        });
      }
      
      if (!enderecoDestino || !itens) {
        return res.status(400).json({
          erro: "Endereço de destino e itens são obrigatórios",
        })
      }

      // Verificar se os itens contêm produtoId e quantidade
      if (!itens.every(item => item.produtoId && item.quantidade)) {
        return res.status(400).json({
          erro: "Cada item deve conter produtoId e quantidade",
        })
      }

      const opcoesFrete = await freteService.calcularFrete(enderecoOrigem, enderecoDestino, itens)
      res.json(opcoesFrete)
    } catch (error) {
      next(error)
    }
  },

  async gerarEtiqueta(req, res, next) {
    try {
      const { pedidoId, enderecoOrigem, enderecoDestino, itens } = req.body

      if (!pedidoId || !enderecoOrigem || !enderecoDestino || !itens) {
        return res.status(400).json({
          erro: "Todos os campos são obrigatórios",
        })
      }

      const etiqueta = await freteService.gerarEtiqueta(pedidoId, enderecoOrigem, enderecoDestino, itens)
      res.json(etiqueta)
    } catch (error) {
      next(error)
    }
  },

  async rastrear(req, res, next) {
    try {
      const { codigoRastreio } = req.params

      if (!codigoRastreio) {
        return res.status(400).json({ erro: "Código de rastreio é obrigatório" })
      }

      const statusEntrega = await freteService.rastrearEntrega(codigoRastreio)
      res.json(statusEntrega)
    } catch (error) {
      next(error)
    }
  },

  async cancelarEtiqueta(req, res, next) {
    try {
      const { codigoRastreio } = req.body

      if (!codigoRastreio) {
        return res.status(400).json({ erro: "Código de rastreio é obrigatório" })
      }

      const resultado = await freteService.cancelarEtiqueta(codigoRastreio)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async criarMetodoFrete(req, res, next) {
    try {
      const { titulo, descricao, valor, prazoEntrega } = req.body

      if (!titulo || !valor || !prazoEntrega) {
        return res.status(400).json({
          erro: "Título, valor e prazo de entrega são obrigatórios",
        })
      }

      const novoMetodo = await freteService.criarMetodoFrete({
        titulo,
        descricao,
        valor,
        prazoEntrega,
      })

      res.status(201).json(novoMetodo)
    } catch (error) {
      next(error)
    }
  },

  async listarMetodosFrete(req, res, next) {
    try {
      const metodos = await freteService.listarMetodosFrete()
      res.json(metodos)
    } catch (error) {
      next(error)
    }
  },

  async obterMetodoFrete(req, res, next) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json({ erro: "ID é obrigatório" })
      }

      const metodo = await freteService.obterMetodoFrete(id)
      res.json(metodo)
    } catch (error) {
      next(error)
    }
  },

  async atualizarMetodoFrete(req, res, next) {
    try {
      const { id } = req.params
      const { titulo, descricao, valor, prazoEntrega, ativo } = req.body

      if (!id) {
        return res.status(400).json({ erro: "ID é obrigatório" })
      }

      const dados = {}
      if (titulo !== undefined) dados.titulo = titulo
      if (descricao !== undefined) dados.descricao = descricao
      if (valor !== undefined) dados.valor = valor
      if (prazoEntrega !== undefined) dados.prazoEntrega = prazoEntrega
      if (ativo !== undefined) dados.ativo = ativo

      const metodoAtualizado = await freteService.atualizarMetodoFrete(id, dados)
      res.json(metodoAtualizado)
    } catch (error) {
      next(error)
    }
  },

  async removerMetodoFrete(req, res, next) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json({ erro: "ID é obrigatório" })
      }

      const resultado = await freteService.removerMetodoFrete(id)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },
}

module.exports = freteController
