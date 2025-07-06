const { VariacaoProduto, Produto } = require("../models")

const variacaoProdutoController = {
  // Criar variação vinculada ao produto
  async criar(req, res, next) {
    try {
      const { produtoId } = req.params
      const { nome, preco, digital = false, estoque = 0, ativo = true } = req.body

      // Verificar existência do produto
      const produto = await Produto.findByPk(produtoId)
      if (!produto) {
        return res.status(404).json({ erro: "Produto não encontrado" })
      }

      const variacao = await VariacaoProduto.create({
        produtoId,
        nome,
        preco,
        digital,
        estoque,
        ativo,
      })

      res.status(201).json(variacao)
    } catch (error) {
      next(error)
    }
  },

  // Criar múltiplas variações de uma vez
  async criarEmLote(req, res, next) {
    try {
      const { produtoId } = req.params
      const variacoes = req.body

      if (!Array.isArray(variacoes)) {
        return res.status(400).json({ erro: "O corpo da requisição deve ser um array de variações" })
      }

      // Verificar existência do produto
      const produto = await Produto.findByPk(produtoId)
      if (!produto) {
        return res.status(404).json({ erro: "Produto não encontrado" })
      }

      // Validar e formatar os dados das variações
      const variacoesComProdutoId = variacoes.map(variacao => {
        // Garantir que o preço seja um número válido
        let preco = 0;
        if (variacao.preco !== undefined) {
          if (typeof variacao.preco === 'string') {
            // Remover qualquer símbolo de moeda e espaços
            let precoLimpo = variacao.preco.trim().replace(/[^\d,.-]/g, '');
            
            // Substituir vírgulas por pontos para o parseFloat funcionar corretamente
            precoLimpo = precoLimpo.replace(',', '.');
            
            // Garantir que temos apenas um ponto decimal
            const partes = precoLimpo.split('.');
            if (partes.length > 2) {
              // Se tiver mais de um ponto, junta tudo antes do último ponto
              // e mantém o último como decimal
              const inteira = partes.slice(0, -1).join('');
              const decimal = partes[partes.length - 1];
              precoLimpo = `${inteira}.${decimal}`;
            }
            
            preco = parseFloat(precoLimpo);
            
            // Se ainda for NaN, define como 0
            if (isNaN(preco)) {
              preco = 0;
            }
          } else if (typeof variacao.preco === 'number') {
            preco = variacao.preco;
          }
        }
        
        return {
          produtoId,
          nome: variacao.nome || "Variação",
          preco: preco,
          digital: !!variacao.digital,
          estoque: parseInt(variacao.estoque) || 0,
          ativo: variacao.ativo !== false
        };
      });

      const variacoesCriadas = await VariacaoProduto.bulkCreate(variacoesComProdutoId)
      res.status(201).json(variacoesCriadas)
    } catch (error) {
      next(error)
    }
  },

  // Listar variações de um produto
  async listar(req, res, next) {
    try {
      const { produtoId } = req.params
      const variacoes = await VariacaoProduto.findAll({ where: { produtoId } })
      res.json(variacoes)
    } catch (error) {
      next(error)
    }
  },

  // Atualizar variação
  async atualizar(req, res, next) {
    try {
      const { id } = req.params
      const variacao = await VariacaoProduto.findByPk(id)
      if (!variacao) {
        return res.status(404).json({ erro: "Variação não encontrada" })
      }
      // Remove valor do body se vier
      if (req.body.valor !== undefined) delete req.body.valor;
      await variacao.update(req.body)
      res.json(variacao)
    } catch (error) {
      next(error)
    }
  },

  // Remover variação
  async remover(req, res, next) {
    try {
      const { id } = req.params
      const variacao = await VariacaoProduto.findByPk(id)
      if (!variacao) {
        return res.status(404).json({ erro: "Variação não encontrada" })
      }
      await variacao.destroy()
      res.json({ message: "Variação removida com sucesso" })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = variacaoProdutoController
