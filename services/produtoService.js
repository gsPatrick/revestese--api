const { Produto, ArquivoProduto, Avaliacao, Usuario, ItemPedido, Pedido, Categoria, VariacaoProduto } = require("../models")
const { Op, fn, col, literal } = require("sequelize")

const produtoService = {
  async criarProduto(dados) {
    try {
      const produto = await Produto.create(dados)
      return produto
    } catch (error) {
      throw error
    }
  },

  async atualizarProduto(id, dados) {
    try {
      const produto = await Produto.findByPk(id)
      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      // Remover atributos inexistentes
      delete dados.tipo;
      // Remove preco e estoque se vierem
      if (dados.preco !== undefined) delete dados.preco;
      if (dados.estoque !== undefined) delete dados.estoque;

      await produto.update(dados)

      return produto
    } catch (error) {
      throw error
    }
  },

  async removerProduto(id) {
    try {
      const produto = await Produto.findByPk(id)
      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      await produto.destroy()
      return { message: "Produto removido com sucesso" }
    } catch (error) {
      throw error
    }
  },

  async listarProdutos(filtros = {}) {
    try {
      const { categorias, busca, page = 1, limit = 10, ordenarPor } = filtros

      const where = { ativo: true }

      if (categorias) {
        const listaCategorias = categorias.split(',').map(c => c.trim());
        if (listaCategorias.length > 0) {
          where.categoriaId = { [Op.in]: listaCategorias };
        }
      }

      if (busca) {
        const palavras = busca.trim().split(/\s+/).filter(palavra => palavra.length > 0);
        
        if (palavras.length > 0) {
          where[Op.and] = palavras.map(palavra => ({
            [Op.or]: [
              {
                nome: {
                  [Op.like]: `%${palavra}%`
                }
              },
              {
                descricao: {
                  [Op.like]: `%${palavra}%`
                }
              }
            ]
          }));
        }
      }

      // Primeiro, contar o número total de produtos
      const totalCount = await Produto.count({ where });
      
      const offset = (page - 1) * limit

      let order = []
      const includeOptions = [
        { model: ArquivoProduto, as: 'ArquivoProdutos', required: false },
        { model: Avaliacao, include: [{ model: Usuario, attributes: ["nome"] }], required: false },
        { model: VariacaoProduto, as: 'variacoes', required: false }
      ];

      // Se o número total de produtos for menor ou igual ao limite,
      // vamos buscar todos os produtos sem paginação
      const findOptions = {
        where,
        include: includeOptions,
        order,
        subQuery: false,
      };
      
      // Só aplicamos limit e offset se tivermos mais produtos que o limite
      if (totalCount > parseInt(limit)) {
        findOptions.limit = parseInt(limit);
        findOptions.offset = offset;
      }

      switch (ordenarPor) {
        case "nome_asc": order.push(["nome", "ASC"]); break;
        case "nome_desc": order.push(["nome", "DESC"]); break;
        case "lancamentos":
        default:
          order.push(["createdAt", "DESC"]);
      }

      const produtos = await Produto.findAll(findOptions);
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';

      const produtosFormatados = produtos.map(produto => {
        const p = produto.toJSON();

        // Adiciona o array de imagens principal
        p.imagens = p.ArquivoProdutos
          .filter(arq => arq.tipo === 'imagem')
          .sort((a, b) => (a.principal ? -1 : 1) - (b.principal ? -1 : 1) || a.ordem - b.ordem) // Principal primeiro
          .map(arq => {
            const path = arq.url.replace(/\\/g, '/');
            return new URL(path, baseUrl).href;
          });

        // Adiciona o array de itens para download
        p.itensDownload = p.ArquivoProdutos
          .filter(arq => arq.tipo === 'arquivo')
          .map(arq => ({
            id: arq.id,
            nome: arq.nome,
            url: (() => {
              const path = arq.url.replace(/\\/g, '/');
              return new URL(path, baseUrl).href;
            })()
          }));
          
        // Adiciona o array de vídeos
        p.videos = p.ArquivoProdutos
          .filter(arq => arq.tipo === 'video')
          .map(arq => ({
            id: arq.id,
            nome: arq.nome,
            url: (() => {
              const path = arq.url.replace(/\\/g, '/');
              return new URL(path, baseUrl).href;
            })(),
            metadados: arq.metadados
          }));
          
        // Converter URL de todos os ArquivoProdutos para absoluto
        p.ArquivoProdutos = p.ArquivoProdutos.map(arq => {
          const path = arq.url.replace(/\\/g, '/');
          return { ...arq, url: new URL(path, baseUrl).href };
        });

        return p;
      });

      return {
        produtos: produtosFormatados,
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        currentPage: parseInt(page),
      }
    } catch (error) {
      console.error("Erro ao listar produtos:", error);
      throw error
    }
  },

  async buscarProdutoPorId(id) {
    try {
      const produto = await Produto.findOne({
        where: { id, ativo: true },
        include: [
          {
            model: ArquivoProduto,
            as: "ArquivoProdutos",
            required: false,
          },
          {
            model: Avaliacao,
            include: [{ model: Usuario, attributes: ["nome"] }],
          },
          {
            model: Categoria,
            as: 'categoria',
            attributes: ['id', 'nome']
          },
          {
            model: VariacaoProduto,
            as: 'variacoes',
            required: false,
          }
        ],
      })

      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      const produtoJSON = produto.toJSON();
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';

      // Adiciona o array de imagens principal
      produtoJSON.imagens = produtoJSON.ArquivoProdutos
        .filter(arq => arq.tipo === 'imagem')
        .sort((a, b) => (a.principal === b.principal) ? 0 : a.principal ? -1 : 1)
        .map(arq => {
          const path = arq.url.replace(/\\/g, '/');
          return new URL(path, baseUrl).href;
        });

      // Adiciona o array de itens para download
      produtoJSON.itensDownload = produtoJSON.ArquivoProdutos
        .filter(arq => arq.tipo === 'arquivo')
        .map(arq => ({
          id: arq.id,
          nome: arq.nome,
          url: (() => {
            const path = arq.url.replace(/\\/g, '/');
            return new URL(path, baseUrl).href;
          })()
        }));
        
      // Adiciona o array de vídeos
      produtoJSON.videos = produtoJSON.ArquivoProdutos
        .filter(arq => arq.tipo === 'video')
        .map(arq => ({
          id: arq.id,
          nome: arq.nome,
          url: (() => {
            const path = arq.url.replace(/\\/g, '/');
            return new URL(path, baseUrl).href;
          })(),
          metadados: arq.metadados
        }));

      // Converter URL de todos os ArquivoProdutos para absoluto
      produtoJSON.ArquivoProdutos = produtoJSON.ArquivoProdutos.map(arq => {
        const path = arq.url.replace(/\\/g, '/');
        return { ...arq, url: new URL(path, baseUrl).href };
      });

      return produtoJSON;
    } catch (error) {
      throw error
    }
  },

  async adicionarImagemProduto(produtoId, imagem) {
    try {
      const produto = await Produto.findByPk(produtoId)
      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      const arquivoProduto = await ArquivoProduto.create({
        produtoId,
        nome: imagem.originalname,
        url: imagem.path,
        mimeType: imagem.mimetype,
        tamanho: imagem.size,
        tipo: "imagem",
      })

      return arquivoProduto
    } catch (error) {
      throw error
    }
  },

  async adicionarArquivoProduto(produtoId, arquivo) {
    try {
      const produto = await Produto.findByPk(produtoId)
      if (!produto) {
        throw new Error("Produto não encontrado")
      }

      const arquivoProduto = await ArquivoProduto.create({
        produtoId,
        nome: arquivo.nomeArquivo,
        url: arquivo.urlArquivo,
        mimeType: arquivo.tipo,
        tamanho: arquivo.tamanho,
        tipo: 'arquivo'
      })

      return arquivoProduto
    } catch (error) {
      throw error
    }
  },

  async removerArquivoProduto(produtoId, arquivoId) {
    try {
      const arquivo = await ArquivoProduto.findOne({
        where: { id: arquivoId, produtoId: produtoId },
      })

      if (!arquivo) {
        throw new Error("Arquivo não encontrado")
      }

      // TODO: Excluir o arquivo do sistema de arquivos (e.g., S3, local)
      // const fs = require('fs').promises;
      // await fs.unlink(arquivo.url);

      await arquivo.destroy()

      return { message: "Arquivo removido com sucesso" }
    } catch (error) {
      throw error
    }
  },

  async listarArquivosPorProduto(produtoId) {
    try {
      const arquivos = await ArquivoProduto.findAll({
        where: { produtoId },
      })

      return arquivos
    } catch (error) {
      throw error
    }
  },

  async listarLancamentos({ limit = 10 } = {}) {
    try {
      const produtos = await Produto.findAll({
        where: { ativo: true },
        include: [
          {
            model: ArquivoProduto,
            as: 'ArquivoProdutos',
            where: { tipo: 'imagem' },
            required: false
          },
          {
            model: VariacaoProduto,
            as: 'variacoes',
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit, 10),
      });

      // Converter URLs relativas para absolutas
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';
      
      const produtosFormatados = produtos.map(produto => {
        const produtoJSON = produto.toJSON();
        
        // Adiciona o array de imagens principal
        produtoJSON.imagens = produtoJSON.ArquivoProdutos
          .filter(arq => arq.tipo === 'imagem')
          .sort((a, b) => (a.principal === b.principal) ? 0 : a.principal ? -1 : 1)
          .map(arq => {
            const path = arq.url.replace(/\\/g, '/');
            return new URL(path, baseUrl).href;
          });
          
        // Adiciona o array de itens para download
        produtoJSON.itensDownload = produtoJSON.ArquivoProdutos
          .filter(arq => arq.tipo === 'arquivo')
          .map(arq => ({
            id: arq.id,
            nome: arq.nome,
            url: (() => {
              const path = arq.url.replace(/\\/g, '/');
              return new URL(path, baseUrl).href;
            })()
          }));
          
        // Adiciona o array de vídeos
        produtoJSON.videos = produtoJSON.ArquivoProdutos
          .filter(arq => arq.tipo === 'video')
          .map(arq => ({
            id: arq.id,
            nome: arq.nome,
            url: (() => {
              const path = arq.url.replace(/\\/g, '/');
              return new URL(path, baseUrl).href;
            })(),
            metadados: arq.metadados
          }));
          
        // Converter URL de todos os ArquivoProdutos para absoluto
        produtoJSON.ArquivoProdutos = produtoJSON.ArquivoProdutos.map(arq => {
          const path = arq.url.replace(/\\/g, '/');
          return { ...arq, url: new URL(path, baseUrl).href };
        });
        
        return produtoJSON;
      });
      
      return produtosFormatados;
    } catch (error) {
      throw error;
    }
  },

  async listarMaisVendidos({ limit = 10 } = {}) {
    try {
      // 1. Buscar todos os pedidos relevantes (pagos, processando, enviados, entregues)
      const pedidos = await Pedido.findAll({
        where: {
          status: { [Op.in]: ['pago', 'processando', 'enviado', 'entregue'] }
        },
        attributes: ['itens']
      });

      if (pedidos.length === 0) {
        return [];
      }

      // 2. Processar os itens para contar as vendas de cada produto
      const contagemDeVendas = pedidos.reduce((acc, pedido) => {
        if (pedido.itens && Array.isArray(pedido.itens)) {
          pedido.itens.forEach(item => {
            if (item.id && item.quantidade) { // Usando item.id para produtoId
              acc[item.id] = (acc[item.id] || 0) + item.quantidade;
            }
          });
        }
        return acc;
      }, {});

      if (Object.keys(contagemDeVendas).length === 0) {
        return [];
      }

      // 3. Ordenar por mais vendidos e pegar os IDs
      const maisVendidosIds = Object.entries(contagemDeVendas)
        .sort(([, a], [, b]) => b - a)
        .slice(0, parseInt(limit, 10))
        .map(([id]) => id);

      if (maisVendidosIds.length === 0) {
        return [];
      }

      // 4. Buscar os detalhes dos produtos mais vendidos
      const produtos = await Produto.findAll({
        where: {
          id: { [Op.in]: maisVendidosIds },
          ativo: true
        },
        include: [
          {
            model: ArquivoProduto,
            as: 'ArquivoProdutos',
            where: { tipo: 'imagem' },
            required: false
          },
          {
            model: VariacaoProduto,
            as: 'variacoes',
            required: false
          }
        ]
      });

      // Ordenar os produtos na mesma ordem da popularidade
      const produtosNaoFormatados = maisVendidosIds.map(id => produtos.find(p => p.id == id)).filter(p => p);
      
      // Converter URLs relativas para absolutas
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';
      
      const produtosFormatados = produtosNaoFormatados.map(produto => {
        const produtoJSON = produto.toJSON();
        
        // Adiciona o array de imagens principal
        produtoJSON.imagens = produtoJSON.ArquivoProdutos
          .filter(arq => arq.tipo === 'imagem')
          .sort((a, b) => (a.principal === b.principal) ? 0 : a.principal ? -1 : 1)
          .map(arq => {
            const path = arq.url.replace(/\\/g, '/');
            return new URL(path, baseUrl).href;
          });
          
        // Adiciona o array de itens para download
        produtoJSON.itensDownload = produtoJSON.ArquivoProdutos
          .filter(arq => arq.tipo === 'arquivo')
          .map(arq => ({
            id: arq.id,
            nome: arq.nome,
            url: (() => {
              const path = arq.url.replace(/\\/g, '/');
              return new URL(path, baseUrl).href;
            })()
          }));
          
        // Adiciona o array de vídeos
        produtoJSON.videos = produtoJSON.ArquivoProdutos
          .filter(arq => arq.tipo === 'video')
          .map(arq => ({
            id: arq.id,
            nome: arq.nome,
            url: (() => {
              const path = arq.url.replace(/\\/g, '/');
              return new URL(path, baseUrl).href;
            })(),
            metadados: arq.metadados
          }));
          
        // Converter URL de todos os ArquivoProdutos para absoluto
        produtoJSON.ArquivoProdutos = produtoJSON.ArquivoProdutos.map(arq => {
          const path = arq.url.replace(/\\/g, '/');
          return { ...arq, url: new URL(path, baseUrl).href };
        });
        
        return produtoJSON;
      });

      return produtosFormatados;
    } catch (error) {
      console.error("Erro detalhado ao listar mais vendidos:", error);
      throw error;
    }
  }
}

module.exports = produtoService
