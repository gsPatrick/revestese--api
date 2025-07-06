const produtoService = require("../services/produtoService")
const multer = require("multer")
const path = require("path")

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({ storage })

const produtoController = {
  async criarProduto(req, res, next) {
    try {
      // Remove preco e estoque se vierem no body
      if (req.body.preco !== undefined) delete req.body.preco;
      if (req.body.estoque !== undefined) delete req.body.estoque;
      const produto = await produtoService.criarProduto(req.body)
      res.status(201).json(produto)
    } catch (error) {
      next(error)
    }
  },

  async atualizarProduto(req, res, next) {
    try {
      const { id } = req.params
      // Remove preco e estoque se vierem no body
      if (req.body.preco !== undefined) delete req.body.preco;
      if (req.body.estoque !== undefined) delete req.body.estoque;
      const produto = await produtoService.atualizarProduto(id, req.body)
      res.json(produto)
    } catch (error) {
      next(error)
    }
  },

  async removerProduto(req, res, next) {
    try {
      const { id } = req.params
      const resultado = await produtoService.removerProduto(id)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async listarProdutos(req, res, next) {
    try {
      const produtos = await produtoService.listarProdutos(req.query)
      res.json(produtos)
    } catch (error) {
      next(error)
    }
  },

  async buscarProduto(req, res, next) {
    try {
      const { id } = req.params
      const produto = await produtoService.buscarProdutoPorId(id)
      res.json(produto)
    } catch (error) {
      next(error)
    }
  },

  async enviarArquivoProduto(req, res, next) {
    try {
      upload.single("arquivo")(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ erro: "Erro no upload do arquivo" })
        }

        const { id } = req.params
        const arquivo = {
          nomeArquivo: req.file.originalname,
          urlArquivo: req.file.path,
          tamanho: req.file.size,
          tipo: req.file.mimetype,
        }

        const resultado = await produtoService.adicionarArquivoProduto(id, arquivo)
        res.json(resultado)
      })
    } catch (error) {
      next(error)
    }
  },

  async baixarArquivosPagos(req, res, next) {
    try {
      const { id } = req.params

      // Verificar se o usuário está autenticado
      if (!req.usuario) {
        return res.status(401).json({ erro: "Usuário não autenticado" });
      }

      const usuarioId = req.usuario.id

      // Verificar se o usuário comprou o produto
      const comprouProduto = await require("../services/pedidoService").verificarSeUsuarioComprouProduto(usuarioId, id)

      if (!comprouProduto) {
        return res.status(403).json({ erro: "Você não comprou este produto" })
      }

      const arquivos = await produtoService.listarArquivosPorProduto(id)
      res.json(arquivos)
    } catch (error) {
      next(error)
    }
  },

  async listarLancamentos(req, res, next) {
    try {
      const { limit } = req.query;
      const produtos = await produtoService.listarLancamentos({ limit });
      res.json(produtos);
    } catch (error) {
      next(error);
    }
  },

  async listarMaisVendidos(req, res, next) {
    try {
      const { limit } = req.query;
      const produtos = await produtoService.listarMaisVendidos({ limit });
      res.json(produtos);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Listar produtos relacionados a um produto
   */
  async listarProdutosRelacionados(req, res, next) {
    try {
      const { id } = req.params
      const { limite = 4 } = req.query

      const relacionados = await produtoService.buscarProdutosRelacionados(id, parseInt(limite))
      res.json(relacionados)
    } catch (error) {
      next(error)
    }
  },

  /**
   * Definir produtos relacionados manualmente
   */
  async definirProdutosRelacionados(req, res, next) {
    try {
      const { id } = req.params
      const { produtosRelacionados } = req.body

      if (!Array.isArray(produtosRelacionados)) {
        return res.status(400).json({ erro: "produtosRelacionados deve ser um array de IDs" })
      }

      const resultado = await produtoService.definirProdutosRelacionados(id, produtosRelacionados)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async removerArquivoProduto(req, res, next) {
    try {
      const { id, arquivoId } = req.params
      const resultado = await produtoService.removerArquivoProduto(id, arquivoId)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = produtoController
