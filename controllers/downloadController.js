const pedidoService = require("../services/pedidoService")

const downloadController = {
  async produtosPagos(req, res, next) {
    try {
      const usuarioId = req.usuario.id
      const produtosPagos = await pedidoService.listarProdutosPagosPorUsuario(usuarioId)
      res.json(produtosPagos)
    } catch (error) {
      next(error)
    }
  },

  async baixarArquivo(req, res, next) {
    try {
      const { produtoId, arquivoId } = req.params
      const usuarioId = req.usuario.id

      // Verificar se o usuário comprou o produto
      const comprouProduto = await pedidoService.verificarSeUsuarioComprouProduto(usuarioId, produtoId)

      if (!comprouProduto) {
        return res.status(403).json({ erro: "Você não comprou este produto" })
      }

      const { ArquivoProduto } = require("../models")
      const arquivo = await ArquivoProduto.findOne({
        where: {
          id: arquivoId,
          produtoId: produtoId,
        },
      })

      if (!arquivo) {
        return res.status(404).json({ erro: "Arquivo não encontrado" })
      }

      // Retornar URL do arquivo para download
      res.json({
        nomeArquivo: arquivo.nomeArquivo,
        urlDownload: arquivo.urlArquivo,
        tamanho: arquivo.tamanho,
      })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = downloadController
