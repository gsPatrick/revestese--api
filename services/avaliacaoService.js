const { Avaliacao, Usuario, Produto } = require("../models")
const pedidoService = require("./pedidoService")

const avaliacaoService = {
  async criarAvaliacao(usuarioId, dados) {
    try {
      const { produtoId, nota, comentario } = dados

      // Verificar se o produto existe
      const produto = await Produto.findByPk(produtoId)
      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      // Verificar se o usuário comprou o produto
      const comprouProduto = await pedidoService.verificarSeUsuarioComprouProduto(usuarioId, produtoId)
      if (!comprouProduto) {
        throw new Error("Você só pode avaliar produtos que comprou")
      }

      // Verificar se já existe avaliação do usuário para este produto
      const avaliacaoExistente = await Avaliacao.findOne({
        where: { usuarioId, produtoId },
      })

      if (avaliacaoExistente) {
        throw new Error("Você já avaliou este produto")
      }

      const avaliacao = await Avaliacao.create({
        usuarioId,
        produtoId,
        nota,
        comentario,
        aprovada: false, // Avaliações precisam ser aprovadas por admin
      })

      return avaliacao
    } catch (error) {
      throw error
    }
  },

  async listarAvaliacoesPorProduto(produtoId, incluirNaoAprovadas = false) {
    try {
      const where = { produtoId }

      if (!incluirNaoAprovadas) {
        where.aprovada = true
      }

      const avaliacoes = await Avaliacao.findAll({
        where,
        include: [
          {
            model: Usuario,
            attributes: ["nome"],
          },
        ],
        order: [["createdAt", "DESC"]],
      })

      return avaliacoes
    } catch (error) {
      throw error
    }
  },

  async listarAvaliacoesPorUsuario(usuarioId) {
    try {
      const avaliacoes = await Avaliacao.findAll({
        where: { usuarioId },
        include: [
          {
            model: Produto,
            attributes: ["nome", "imagens"],
          },
        ],
        order: [["createdAt", "DESC"]],
      })

      return avaliacoes
    } catch (error) {
      throw error
    }
  },

  async buscarAvaliacaoPorId(id) {
    try {
      const avaliacao = await Avaliacao.findByPk(id, {
        include: [
          {
            model: Usuario,
            attributes: ["nome"],
          },
          {
            model: Produto,
            attributes: ["nome"],
          },
        ],
      })

      if (!avaliacao) {
        throw new Error("Avaliação não encontrada")
      }

      return avaliacao
    } catch (error) {
      throw error
    }
  },

  async atualizarAvaliacao(id, usuarioId, dados) {
    try {
      const avaliacao = await Avaliacao.findOne({
        where: { id, usuarioId },
      })

      if (!avaliacao) {
        throw new Error("Avaliação não encontrada ou você não tem permissão")
      }

      // Ao atualizar, a avaliação volta para não aprovada
      await avaliacao.update({
        ...dados,
        aprovada: false,
      })

      return avaliacao
    } catch (error) {
      throw error
    }
  },

  async removerAvaliacao(id, usuarioId) {
    try {
      const avaliacao = await Avaliacao.findOne({
        where: { id, usuarioId },
      })

      if (!avaliacao) {
        throw new Error("Avaliação não encontrada ou você não tem permissão")
      }

      await avaliacao.destroy()
      return { message: "Avaliação removida com sucesso" }
    } catch (error) {
      throw error
    }
  },

  async aprovarAvaliacao(id) {
    try {
      const avaliacao = await Avaliacao.findByPk(id)
      if (!avaliacao) {
        throw new Error("Avaliação não encontrada")
      }

      avaliacao.aprovada = true
      await avaliacao.save()

      return avaliacao
    } catch (error) {
      throw error
    }
  },

  async listarAvaliacoesPendentes() {
    try {
      const avaliacoes = await Avaliacao.findAll({
        where: { aprovada: false },
        include: [
          {
            model: Usuario,
            attributes: ["nome"],
          },
          {
            model: Produto,
            attributes: ["nome"],
          },
        ],
        order: [["createdAt", "ASC"]],
      })

      return avaliacoes
    } catch (error) {
      throw error
    }
  },

  async calcularMediaAvaliacoes(produtoId) {
    try {
      const { sequelize } = require("../config/database")

      const resultado = await Avaliacao.findOne({
        where: { produtoId, aprovada: true },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("nota")), "media"],
          [sequelize.fn("COUNT", sequelize.col("id")), "total"],
        ],
      })

      return {
        media: Number.parseFloat(resultado.dataValues.media || 0).toFixed(1),
        total: Number.parseInt(resultado.dataValues.total || 0),
      }
    } catch (error) {
      throw error
    }
  },
}

module.exports = avaliacaoService
