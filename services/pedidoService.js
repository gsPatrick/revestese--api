const { Pedido, Usuario, Produto, Pagamento, ArquivoProduto, Frete, VariacaoProduto } = require("../models")
const { enviarEmail, templateConfirmacaoPedido } = require("../utils/email")
const cupomService = require("./cupomService")
const notificacaoService = require("./notificacaoService")
const pagamentoService = require("./pagamentoService")

const pedidoService = {
 async criarPedido(usuarioId, itensPedido, enderecoEntrega, freteId, cupomCodigo = null) {
    try {
      let total = 0;
      let desconto = 0;
      let valorFrete = 0;
      let dadosFrete = null;

      // Verificar se todos os produtos são digitais
      const verificacoesDigitais = await Promise.all(itensPedido.map(async (item) => {
        if (item.variacaoId) {
          const variacao = await VariacaoProduto.findOne({
            where: { id: item.variacaoId, produtoId: item.produtoId }
          });
          return variacao?.digital || false;
        }
        return false;
      }));
      const todosDigitais = verificacoesDigitais.every(isDigital => isDigital);

      // Se não for pedido totalmente digital, verificar se o enderecoEntrega foi fornecido
      if (!todosDigitais && !enderecoEntrega) {
        throw new Error("Endereço de entrega é obrigatório para produtos físicos.");
      }

      // Se freteId é fornecido, calcular/definir valor do frete
      if (freteId) {
        const freteIdStr = String(freteId);
        if (freteIdStr.startsWith('custom_')) {
          const { MetodoFrete } = require("../models");
          const metodoFreteId = freteIdStr.replace('custom_', '');
          const metodoFrete = await MetodoFrete.findByPk(metodoFreteId);

          if (!metodoFrete) {
            throw new Error("Método de frete personalizado não encontrado.");
          }
          valorFrete = parseFloat(metodoFrete.valor);
          dadosFrete = {
            servico: metodoFrete.titulo,
            valor: valorFrete,
            prazoEntrega: metodoFrete.prazoEntrega,
            statusEntrega: "pendente"
          };
        } else {
          // Aqui você faria a chamada para o Melhor Envio, por exemplo.
          // Para fins de teste, vamos assumir um valor fixo.
          valorFrete = 15.00;
          dadosFrete = {
            servico: "Correios PAC",
            valor: valorFrete,
            prazoEntrega: 7,
            statusEntrega: "pendente"
          };
        }
      }

      // Calcular total dos itens e ajustar estoque
      const itensProcessados = [];
      for (const item of itensPedido) {
        const produto = await Produto.findByPk(item.produtoId);
        if (!produto || !produto.ativo) {
          throw new Error(`Produto ${item.produtoId} não encontrado ou inativo`);
        }

        let variacao = null;
        let precoBase;
        let eDigital = false;

        if (item.variacaoId) {
          variacao = await VariacaoProduto.findOne({ where: { id: item.variacaoId, produtoId: item.produtoId } });
          if (!variacao || !variacao.ativo) {
            throw new Error(`Variação ${item.variacaoId} não encontrada ou inativa`);
          }
          precoBase = variacao.preco;
          eDigital = variacao.digital;
          if (!eDigital && variacao.estoque < item.quantidade) {
            throw new Error(`Estoque insuficiente para a variação ${variacao.nome}`);
          }
        } else {
          // Se o produto não tem variações, busca o preço e estoque direto nele
          precoBase = produto.preco; // Supondo que produto sem variação tem um campo 'preco'
          eDigital = false; // Supondo que produto sem variação não é digital
          if (produto.estoque < item.quantidade) { // Supondo que produto sem variação tem 'estoque'
            throw new Error(`Estoque insuficiente para ${produto.nome}`);
          }
        }

        total += precoBase * item.quantidade;

        itensProcessados.push({
          produtoId: item.produtoId,
          variacaoId: item.variacaoId || null,
          nome: variacao ? `${produto.nome} - ${variacao.nome}` : produto.nome,
          preco: precoBase,
          quantidade: item.quantidade,
          subtotal: precoBase * item.quantidade,
          digital: eDigital,
        });
      }

      // Aplicar cupom se fornecido
      if (cupomCodigo) {
        const resultadoCupom = await cupomService.aplicarCupom({ total }, cupomCodigo);
        desconto = resultadoCupom.desconto;
        total = resultadoCupom.total;
      }

      // Adicionar valor do frete ao total
      const totalComFrete = total + valorFrete;

      // Criar o pedido
      const pedido = await Pedido.create({
        usuarioId,
        itens: itensProcessados,
        total: todosDigitais ? total : totalComFrete,
        valorFrete: todosDigitais ? 0 : valorFrete,
        desconto,
        cupomAplicado: cupomCodigo,
        enderecoEntrega: todosDigitais ? null : enderecoEntrega, // Objeto completo de endereço
        status: "pendente",
      });

      // Criar o registro de frete apenas para produtos físicos
      if (dadosFrete && !todosDigitais) {
        await Frete.create({
          pedidoId: pedido.id,
          ...dadosFrete
        });
      }

      // Atualizar estoque para produtos físicos ou variações físicas
      for (const item of itensPedido) {
        if (item.variacaoId) {
          const variacao = await VariacaoProduto.findByPk(item.variacaoId);
          if (variacao && !variacao.digital) { // Só reduz estoque se não for digital
            variacao.estoque -= item.quantidade;
            await variacao.save();
          }
        } else {
          const produto = await Produto.findByPk(item.produtoId);
          if (produto) { // Para produtos sem variação
            produto.estoque -= item.quantidade;
            await produto.save();
          }
        }
      }

      return pedido;
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      throw error;
    }
  },

  async atualizarStatusPedido(pedidoId, status) {
    try {
      const pedido = await Pedido.findByPk(pedidoId, {
        include: [{ model: Usuario }],
      })

      if (!pedido) {
        throw new Error("Pedido não encontrado")
      }

      pedido.status = status
      await pedido.save()

      // Enviar notificação automática
      try {
        await notificacaoService.enviarAtualizacaoStatus(pedidoId, status)
      } catch (emailError) {
        console.error("Erro ao enviar notificação:", emailError)
        // Não falhar a operação se o email falhar
      }

      // Enviar email de confirmação se status for "pago"
      if (status === "pago") {
        await enviarEmail(pedido.Usuario.email, "Pedido Confirmado", templateConfirmacaoPedido(pedido))
      }

      return pedido
    } catch (error) {
      throw error
    }
  },

  async listarPedidos(usuarioId, filtros = {}) {
    try {
      const { status, page = 1, limit = 10 } = filtros
      const where = {}
      if (usuarioId != null) where.usuarioId = usuarioId

      if (status) {
        where.status = status
      }

      const offset = (page - 1) * limit

      const { count, rows } = await Pedido.findAndCountAll({
        where,
        include: [{ model: Usuario, attributes: ["nome", "email"] }],
        limit: Number.parseInt(limit),
        offset,
        order: [["createdAt", "DESC"]],
      })

      // Mapear pedidos para incluir detalhes dos produtos nos itens
      const pedidosComDetalhes = await Promise.all(rows.map(async (pedido) => {
        const itensComDetalhes = await Promise.all(pedido.itens.map(async (item) => {
          const produto = await Produto.findByPk(item.produtoId, {
            include: [{ model: ArquivoProduto, as: 'ArquivoProdutos' }]
          });
          
          let imagemUrl = null;
          if (produto && produto.ArquivoProdutos && produto.ArquivoProdutos.length > 0) {
            // A URL já vem completa do banco de dados, não é necessário adicionar prefixos.
            imagemUrl = produto.ArquivoProdutos[0].url;
          }

          return {
            ...item,
            produto: {
              id: produto ? produto.id : null,
              nome: produto ? produto.nome : 'Produto não encontrado',
              imagemUrl: imagemUrl
            }
          };
        }));
        
        // Retorna uma nova versão do objeto do pedido com os itens detalhados
        return { ...pedido.toJSON(), itens: itensComDetalhes };
      }));

      return {
        pedidos: pedidosComDetalhes,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number.parseInt(page),
      }
    } catch (error) {
      throw error
    }
  },

  async buscarPedidoPorId(pedidoId) {
    try {
      const pedido = await Pedido.findByPk(pedidoId, {
        include: [{ model: Usuario, attributes: ["nome", "email"] }, { model: Pagamento }],
      })

      if (!pedido) {
        throw new Error("Pedido não encontrado")
      }

      return pedido
    } catch (error) {
      throw error
    }
  },

  async cancelarPedido(pedidoId) {
    try {
      const pedido = await Pedido.findByPk(pedidoId)
      if (!pedido) {
        throw new Error("Pedido não encontrado")
      }

      if (pedido.status === "entregue") {
        throw new Error("Não é possível cancelar pedido já entregue")
      }

      // Restaurar estoque
      for (const item of pedido.itens) {
        if (item.variacaoId) {
          const variacao = await VariacaoProduto.findByPk(item.variacaoId)
          if (variacao && !variacao.digital) {
            variacao.estoque += item.quantidade
            await variacao.save()
          }
        } else {
          const produto = await Produto.findByPk(item.produtoId)
          if (produto) {
            produto.estoque += item.quantidade
            await produto.save()
          }
        }
      }

      pedido.status = "cancelado"
      await pedido.save()

      return pedido
    } catch (error) {
      throw error
    }
  },

  async verificarSeUsuarioComprouProduto(usuarioId, produtoId) {
    try {
      const pedido = await Pedido.findOne({
        where: {
          usuarioId,
          status: "pago",
        },
      })

      if (!pedido) return false

      const comprouProduto = pedido.itens.some((item) => item.produtoId === produtoId)
      return comprouProduto
    } catch (error) {
      throw error
    }
  },

  async listarProdutosPagosPorUsuario(usuarioId) {
    try {
      const pedidos = await Pedido.findAll({
        where: {
          usuarioId,
          status: "pago",
        },
      })

      const produtosPagos = []
      for (const pedido of pedidos) {
        for (const item of pedido.itens) {
          const produto = await Produto.findByPk(item.produtoId, {
            include: [{ model: ArquivoProduto }],
          })
          if (produto) {
            produtosPagos.push({
              produtoId: produto.id,
              nome: produto.nome,
              arquivos: produto.ArquivoProdutos,
            })
          }
        }
      }

      return produtosPagos
    } catch (error) {
      throw error
    }
  },

  // FUNÇÃO CORRIGIDA
async obterDownloadsPorUsuario(usuarioId) {
    try {
      const pedidos = await Pedido.findAll({
        where: {
          usuarioId,
          status: ['pago', 'processando', 'enviado', 'entregue', 'concluido'],
        },
        attributes: ['itens'],
      });

      const uniqueDigitalProductIds = new Set();

      for (const pedido of pedidos) {
        if (pedido.itens && Array.isArray(pedido.itens)) {
          for (const item of pedido.itens) {
            if (item.digital) { // Assume que a flag digital está no item do pedido
                 uniqueDigitalProductIds.add(item.produtoId);
            }
          }
        }
      }

      if (uniqueDigitalProductIds.size === 0) {
          return [];
      }

      // 2. Buscar os detalhes dos PRODUTOS digitais únicos, INCLUINDO SEUS ARQUIVOS DIGITAIS E IMAGEM PRINCIPAL via associação
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';

      const produtosDigitaisComArquivos = await Produto.findAll({
        where: {
          id: { [Op.in]: Array.from(uniqueDigitalProductIds) },
          ativo: true, 
        },
        include: [{
          model: ArquivoProduto,
          as: 'ArquivoProdutos',
          // Inclui arquivos digitais E imagem principal
          where: { 
              [Op.or]: [
                  { tipo: 'arquivo' }, 
                  { tipo: 'imagem', principal: true } // Incluir a imagem principal
              ]
          }, 
          required: false // Não exige que o produto tenha arquivos (pode ter só a imagem principal)
        }],
        attributes: [
            'id', 
            'nome', 
            'slug', 
            'descricao', 
            // Não precisamos mais buscar 'imagens' ou 'itensDownload' como JSON aqui
        ], 
      });

      // 3. Formatar os dados para o frontend
      const downloadsFormatados = produtosDigitaisComArquivos.map(produto => {
        const produtoJSON = produto.toJSON();
        const arquivosDoProduto = produtoJSON.ArquivoProdutos || [];

        // Encontra a imagem principal (que veio na include, se existir)
        const imagemPrincipal = arquivosDoProduto.find(arq => arq.tipo === 'imagem' && arq.principal);
        // Formata a URL da imagem principal
        const imagemUrl = imagemPrincipal?.url ? new URL(imagemPrincipal.url.replace(/\\/g, '/'), baseUrl).href : 'https://placehold.co/80x80.png';

        // Filtra e formata APENAS os arquivos digitais para a lista de downloads
        const arquivosDigitaisFormatados = arquivosDoProduto
          .filter(arq => arq.tipo === 'arquivo')
          .map(arq => ({
            id: arq.id,
            nome: arq.nome,
            url: arq.url, // Caminho relativo /uploads/...
            fullUrl: new URL(arq.url.replace(/\\/g, '/'), baseUrl).href, // URL completa para download
            mimeType: arq.mimeType,
            tamanho: arq.tamanho,
          }));

        return {
          produtoId: produtoJSON.id,
          nome: produtoJSON.nome, 
          slug: produtoJSON.slug, 
          descricao: produtoJSON.descricao,
          imagemUrl: imagemUrl, // URL completa da imagem principal
          arquivos: arquivosDigitaisFormatados, // Lista de arquivos digitais formatada
        };
      });

      // Opcional: Filtrar resultados para remover produtos que não tinham arquivos digitais tipo 'arquivo'
      // (se required: false e um produto só tinha a imagem principal, ele virá mas sem arquivos digitais)
       const downloadsComArquivosReais = downloadsFormatados.filter(item => item.arquivos.length > 0);


      // Retorna a lista final com nome, slug, imagem e arquivos
      return downloadsComArquivosReais;

    } catch (error) {
      console.error("Erro ao obter downloads do usuário:", error);
      if (error.original?.sqlMessage) {
           console.error("Detalhes do erro SQL:", error.original.sqlMessage, error.sql);
       }
       if (error.original?.code === 'ER_BAD_FIELD_ERROR') {
            throw new Error("Erro na estrutura do banco de dados. A coluna 'slug' pode estar faltando na tabela 'produtos'.");
       }
      throw error;
    }
  },
  // ... (outras funções) ...
   async buscarProdutosRelacionados(idOuSlug, limite = 4) {
    try {
      // ... (mantido como antes, ele busca slug e formata URLs) ...
       const isNumeric = !isNaN(parseFloat(idOuSlug)) && isFinite(idOuSlug);
      const whereClause = isNumeric ? { id: idOuSlug } : { slug: idOuSlug };

      const produtoAtual = await Produto.findOne({ where: whereClause });
      if (!produtoAtual || !produtoAtual.categoriaId) {
        return [];
      }

      const relacionados = await Produto.findAll({
        where: {
          categoriaId: produtoAtual.categoriaId,
          id: { [Op.ne]: produtoAtual.id },
          ativo: true,
        },
        limit: parseInt(limite),
        // Aqui você pode escolher incluir ArquivoProduto OU usar a propriedade JSON 'imagens'
        // Se a versão antiga do modelo Produto tinha 'imagens' como JSON e o frontend lê de lá,
        // então NÃO inclua ArquivoProduto aqui para relacionados.
        // Mas o seu produtoService.listarProdutos e buscarProdutoPorId incluem ArquivoProdutos.
        // Vamos manter a consistência e incluir ArquivoProdutos, e formatar como array de URLs.
        include: [
          { model: ArquivoProduto, as: 'ArquivoProdutos', required: false },
          { model: VariacaoProduto, as: 'variacoes', required: false },
        ],
      });

      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';
      const produtosFormatados = relacionados.map(produto => {
        const p = produto.toJSON();
         // Formata o array de URLs de imagens a partir da associação ArquivoProduto
        p.imagens = (p.ArquivoProdutos || [])
          .filter(arq => arq.tipo === 'imagem')
          .sort((a, b) => (a.principal ? -1 : 1) - (b.principal ? -1 : 1))
          .map(arq => new URL(arq.url.replace(/\\/g, '/'), baseUrl).href);
         // Limpa a associação ArquivoProdutos do objeto final se não quiser retorná-la diretamente
         delete p.ArquivoProdutos; 
        return p;
      });

      return produtosFormatados;

    } catch (error) {
      console.error("Erro ao buscar produtos relacionados:", error);
      throw error;
    }
  },

   async buscarProdutosRelacionados(produtoId, limite = 4) {
    try {
      const produtoAtual = await Produto.findByPk(produtoId);
      if (!produtoAtual || !produtoAtual.categoriaId) {
        return []; // Retorna vazio se o produto ou sua categoria não forem encontrados
      }

      const relacionados = await Produto.findAll({
        where: {
          categoriaId: produtoAtual.categoriaId,
          id: { [Op.ne]: produtoId }, // Exclui o próprio produto da lista
          ativo: true,
        },
        limit: parseInt(limite),
        include: [
          { model: ArquivoProduto, as: 'ArquivoProdutos', required: false },
          { model: VariacaoProduto, as: 'variacoes', required: false },
        ],
      });

      // Formata os produtos para o frontend, garantindo a URL completa da imagem
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035';
      const produtosFormatados = relacionados.map(produto => {
        const p = produto.toJSON();
        p.imagens = p.ArquivoProdutos
          ?.filter(arq => arq.tipo === 'imagem')
          .sort((a, b) => (a.principal ? -1 : 1) - (b.principal ? -1 : 1))
          .map(arq => new URL(arq.url.replace(/\\/g, '/'), baseUrl).href);
        return p;
      });

      return produtosFormatados;

    } catch (error) {
      console.error("Erro ao buscar produtos relacionados:", error);
      throw error;
    }
  },
}

module.exports = pedidoService;