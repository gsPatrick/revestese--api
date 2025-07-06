const uploadService = require("../services/uploadService")
const { ArquivoProduto } = require("../models")
const { deleteImageVariants } = require("../utils/imageProcessor")
const produtoService = require("../services/produtoService")
const fs = require("fs")

const uploadController = {
  /**
   * Upload de imagem de produto
   */
  async uploadProdutoImagem(req, res, next) {
    try {
      if (!req.processedImage) {
        return res.status(400).json({ erro: "Nenhuma imagem processada" })
      }

      const { produtoId } = req.params
      const processedImage = req.processedImage

      // Criar registro da imagem no banco
      const imagem = await ArquivoProduto.create({
        produtoId,
        tipo: "imagem",
        nome: processedImage.filename,
        url: `/uploads/imagens/medium/${processedImage.filename}.avif`,
        metadados: {
          formatos: ["avif", "webp"],
          tamanhos: Object.keys(processedImage.variants),
          variantes: processedImage.variants,
          original: processedImage.original
        },
        principal: false, // Por padrão não é a imagem principal
      })

      res.json(imagem)
    } catch (error) {
      next(error)
    }
  },

  /**
   * Upload de múltiplas imagens de produto
   */
  async uploadProdutoImagens(req, res, next) {
    try {
      if (!req.processedImages || req.processedImages.length === 0) {
        return res.status(400).json({ erro: "Nenhuma imagem processada" })
      }

      const { produtoId } = req.params
      const processedImages = req.processedImages

      // Verificar se já existem imagens para este produto
      const imagensExistentes = await ArquivoProduto.findAll({
        where: { produtoId, tipo: "imagem" }
      })

      // Definir a primeira imagem como principal se não existirem outras
      let definirComoPrincipal = imagensExistentes.length === 0

      // Criar registros para cada imagem
      const imagens = []

      for (let i = 0; i < processedImages.length; i++) {
        const processedImage = processedImages[i]

        const imagem = await ArquivoProduto.create({
          produtoId,
          tipo: "imagem",
          nome: processedImage.filename,
          url: `/uploads/imagens/medium/${processedImage.filename}.avif`,
          metadados: {
            formatos: ["avif", "webp"],
            tamanhos: Object.keys(processedImage.variants),
            variantes: processedImage.variants,
            original: processedImage.original
          },
          principal: definirComoPrincipal,
        })

        imagens.push(imagem)
        // Apenas a primeira imagem nova será principal
        if (definirComoPrincipal) {
          definirComoPrincipal = false
        }
      }

      res.json(imagens)
    } catch (error) {
      next(error)
    }
  },

  /**
   * Upload de arquivo de produto digital
   */
  async uploadProdutoArquivo(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ erro: "Nenhum arquivo enviado" });
      }

      const { produtoId } = req.params;
      const { file } = req;

      const arquivo = await ArquivoProduto.create({
        produtoId,
        tipo: 'arquivo',
        nome: file.originalname,
        url: file.path,
        mimeType: file.mimetype,
        tamanho: file.size,
      });

      res.status(201).json(arquivo);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload de vídeo de produto
   */
  async uploadProdutoVideo(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ erro: "Nenhum vídeo enviado" });
      }

      const { produtoId } = req.params;
      const { file } = req;
      
      // Mover o arquivo para a pasta de vídeos
      const videoPath = `uploads/videos/${file.filename}`;
      fs.renameSync(file.path, videoPath);
      
      const relativePath = `/${videoPath}`;
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';
      const fullUrl = new URL(relativePath, baseUrl).href;

      const video = await ArquivoProduto.create({
        produtoId,
        tipo: 'video',
        nome: file.originalname,
        url: relativePath, // Caminho relativo para armazenar no banco
        mimeType: file.mimetype,
        tamanho: file.size,
        metadados: {
          original: file.filename,
          fullUrl: fullUrl // URL completa para o frontend
        }
      });

      // Adicionar a URL completa na resposta para o frontend
      const videoResponse = video.toJSON();
      videoResponse.fullUrl = fullUrl;

      res.status(201).json(videoResponse);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Define uma imagem como a principal de um produto
   */
  async definirImagemPrincipal(req, res, next) {
    try {
      const { produtoId, arquivoId } = req.params

      // Primeiro, remove a flag 'principal' de outras imagens do mesmo produto
      await ArquivoProduto.update(
        { principal: false },
        { where: { produtoId, tipo: "imagem" } }
      )

      // Depois, define a imagem escolhida como principal
      const [updatedRows] = await ArquivoProduto.update(
        { principal: true },
        { where: { id: arquivoId, produtoId, tipo: "imagem" } }
      )

      if (updatedRows === 0) {
        return res.status(404).json({ erro: "Imagem não encontrada" })
      }

      res.json({ message: "Imagem principal definida com sucesso" })
    } catch (error) {
      next(error)
    }
  },

  /**
   * Exclui um arquivo (imagem ou de download) de um produto
   */
  async excluirArquivo(req, res, next) {
    try {
      const { arquivoId } = req.params
      const arquivo = await ArquivoProduto.findByPk(arquivoId)

      if (!arquivo) {
        return res.status(404).json({ erro: "Arquivo não encontrado" })
      }

      // Excluir do sistema de arquivos
      if (arquivo.tipo === "imagem" && arquivo.metadados?.variantes) {
        await deleteImageVariants(arquivo.metadados.variantes)
      } else {
        // Para arquivos normais ou imagens sem variantes
        await uploadService.removerArquivo(arquivo.url)
      }

      // Excluir do banco de dados
      await arquivo.destroy()

      res.json({ message: "Arquivo excluído com sucesso" })
    } catch (error) {
      next(error)
    }
  },

  /**
   * Atualiza a ordem das imagens de um produto
   */
  async atualizarOrdemImagens(req, res, next) {
    try {
      const { produtoId } = req.params;
      const { ordem } = req.body;

      if (!Array.isArray(ordem)) {
        return res.status(400).json({ erro: "O formato da ordem deve ser um array de IDs" });
      }

      // Atualizar a ordem de cada imagem
      for (let i = 0; i < ordem.length; i++) {
        await ArquivoProduto.update(
          { ordem: i },
          { where: { id: ordem[i], produtoId, tipo: "imagem" } }
        );
      }

      // Retornar as imagens atualizadas
      const imagens = await ArquivoProduto.findAll({
        where: { produtoId, tipo: "imagem" },
        order: [["ordem", "ASC"]]
      });

      res.json(imagens);
    } catch (error) {
      next(error);
    }
  },

  async uploadArquivoProduto(req, res, next) {
    try {
      uploadService.uploadArquivoProduto(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ erro: err.message })
        }

        if (!req.file) {
          return res.status(400).json({ erro: "Nenhum arquivo enviado" })
        }

        const { produtoId } = req.params

        if (!produtoId) {
          return res.status(400).json({ erro: "ID do produto é obrigatório" })
        }

        // Salvar arquivo sem processamento (para produtos digitais)
        const arquivoInfo = await uploadService.salvarArquivo(req.file, "produto")

        // Adicionar arquivo ao produto
        const arquivo = await produtoService.adicionarArquivoProduto(produtoId, {
          nomeArquivo: arquivoInfo.nomeOriginal,
          urlArquivo: arquivoInfo.url,
          tamanho: arquivoInfo.tamanho,
          tipo: arquivoInfo.tipo,
        })

        res.json(arquivo)
      })
    } catch (error) {
      next(error)
    }
  },

  async otimizarImagem(req, res, next) {
    try {
      const { caminho } = req.body

      if (!caminho) {
        return res.status(400).json({ erro: "Caminho é obrigatório" })
      }

      // ... existing code ...
    } catch (error) {
      next(error)
    }
  }
}

module.exports = uploadController
