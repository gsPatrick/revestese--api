const { Pedido, Usuario, Produto, Pagamento, ArquivoProduto, Frete, VariacaoProduto } = require("../models");
const { sequelize } = require("../config/database");
const { enviarEmail, templateConfirmacaoPedido } = require("../utils/email");
const cupomService = require("./cupomService");
const notificacaoService = require("./notificacaoService");
const { Op, Transaction } = require("sequelize");

const pedidoService = {

  // ─────────────────────────────────────────────────────────────────────────────
  // CRIAR PEDIDO  — toda a operação dentro de uma única transaction READ COMMITTED
  // Garante que se qualquer passo falhar (estoque, cupom, frete) nada fica gravado.
  // A deducão de estoque usa UPDATE atômico (WHERE estoque >= quantidade) para
  // evitar overselling mesmo com 50+ compradores simultâneos.
  // ─────────────────────────────────────────────────────────────────────────────
  async criarPedido(usuarioId, itensPedido, enderecoEntrega, freteId, cupomCodigo = null) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[PEDIDO] ▶ Iniciando criação | usuário #${usuarioId}`);
    console.log(`[PEDIDO]   Itens: ${JSON.stringify(itensPedido.map(i => ({ id: i.produtoId, var: i.variacaoId, qty: i.quantidade })))}`);
    console.log(`[PEDIDO]   Frete ID: ${freteId || 'nenhum'} | Cupom: ${cupomCodigo || 'nenhum'}`);
    console.log(`[PEDIDO]   Endereço CEP: ${enderecoEntrega?.cep || 'digital'}`);

    const t = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    });

    try {
      let total = 0;
      let desconto = 0;
      let valorFrete = 0;
      let dadosFrete = null;
      let cupomAplicadoId = null;

      // 1. Verificar se todos os itens são digitais (resolve variação padrão se variacaoId vier vazio)
      const verificacoesDigitais = await Promise.all(itensPedido.map(async (item) => {
        let v = item.variacaoId
          ? await VariacaoProduto.findOne({
              where: { id: item.variacaoId, produtoId: item.produtoId },
              transaction: t,
            })
          : await VariacaoProduto.findOne({
              where: { produtoId: item.produtoId, ativo: true },
              order: [["id", "ASC"]],
              transaction: t,
            });
        if (!v || !v.ativo) return false;
        return v.digital;
      }));
      const todosDigitais = verificacoesDigitais.every(Boolean);

      if (!todosDigitais && !enderecoEntrega) {
        throw new Error("Endereço de entrega é obrigatório para produtos físicos.");
      }

      // 2. Validar produtos e calcular total
      const itensProcessados = [];
      let quantidadeTotalItens = 0;

      for (const item of itensPedido) {
        const produto = await Produto.findByPk(item.produtoId, { transaction: t });
        if (!produto || !produto.ativo) throw new Error(`Produto ${item.produtoId} não encontrado ou inativo.`);

        const qty = parseInt(item.quantidade, 10);
        if (!Number.isFinite(qty) || qty < 1) {
          throw new Error(`Quantidade inválida para "${produto.nome}".`);
        }

        const variacao = item.variacaoId
          ? await VariacaoProduto.findOne({
              where: { id: item.variacaoId, produtoId: item.produtoId },
              transaction: t,
            })
          : await VariacaoProduto.findOne({
              where: { produtoId: item.produtoId, ativo: true },
              order: [["id", "ASC"]],
              transaction: t,
            });

        if (!variacao || !variacao.ativo) {
          throw new Error(
            item.variacaoId
              ? `Variação ${item.variacaoId} para "${produto.nome}" não encontrada ou inativa.`
              : `Produto "${produto.nome}" não possui variação disponível para compra.`
          );
        }

        const precoBase = variacao.preco;
        const eDigital = variacao.digital;

        if (!eDigital && variacao.estoque < qty) {
          throw new Error(`Estoque insuficiente para "${variacao.nome}".`);
        }

        total += parseFloat(precoBase) * qty;
        quantidadeTotalItens += qty;
        itensProcessados.push({
          produtoId: item.produtoId,
          variacaoId: variacao.id,
          nome: `${produto.nome} - ${variacao.nome}`,
          preco: parseFloat(precoBase),
          quantidade: qty,
          subtotal: parseFloat(precoBase) * qty,
          digital: eDigital,
        });
      }

      console.log(`[PEDIDO]   Subtotal itens: R$ ${total.toFixed(2)} | Qtd total: ${quantidadeTotalItens} | Digital: ${todosDigitais}`);

      // 3. Validar e aplicar cupom (somente leitura; incremento atômico depois)
      if (cupomCodigo) {
        console.log(`[PEDIDO]   Validando cupom "${cupomCodigo}"...`);
        const cupom = await cupomService.validarCupom(cupomCodigo, total, quantidadeTotalItens, usuarioId);
        desconto = cupom.tipo === "percentual" ? (total * cupom.valor) / 100 : cupom.valor;
        total = Math.max(0, total - desconto);
        cupomAplicadoId = cupom.id;
        console.log(`[PEDIDO]   Cupom OK | desconto: R$ ${desconto.toFixed(2)} | total após cupom: R$ ${total.toFixed(2)}`);
      }

      // 4. Calcular frete
      if (!todosDigitais) {
        console.log(`[PEDIDO]   Calculando frete para CEP ${enderecoEntrega?.cep}...`);
        const freteOpts = await require('./freteService').calcularFrete(
          await require('./configuracaoLojaService').obterEnderecoOrigem(),
          enderecoEntrega,
          itensPedido.filter((_, i) => !verificacoesDigitais[i])
        );
        const freteSelecionado = freteOpts.find(opt => opt.id === freteId);
        if (!freteSelecionado) throw new Error("Método de frete selecionado inválido.");
        valorFrete = parseFloat(freteSelecionado.price);
        dadosFrete = {
          servico: freteSelecionado.name,
          valor: valorFrete,
          prazoEntrega: freteSelecionado.delivery_time,
          statusEntrega: "pendente",
        };
        console.log(`[PEDIDO]   Frete selecionado: ${dadosFrete.servico} | R$ ${valorFrete.toFixed(2)} | ${dadosFrete.prazoEntrega}d`);
      }

      const totalFinal = total + valorFrete;
      console.log(`[PEDIDO]   TOTAL FINAL: R$ ${totalFinal.toFixed(2)} (itens: R$ ${total.toFixed(2)} + frete: R$ ${valorFrete.toFixed(2)} - desc: R$ ${desconto.toFixed(2)})`);

      // 5. Criar o pedido (dentro da transaction)
      const pedido = await Pedido.create({
        usuarioId,
        itens: itensProcessados,
        total: totalFinal,
        valorFrete,
        desconto,
        cupomAplicado: cupomCodigo,
        cupomAplicadoId,
        enderecoEntrega: todosDigitais ? null : enderecoEntrega,
        status: "pendente",
      }, { transaction: t });

      // 6. Incremento ATÔMICO do cupom (falha se limite foi atingido entre validação e agora)
      if (cupomAplicadoId) {
        await cupomService.incrementarUso(cupomAplicadoId, t);
      }

      // 7. Criar registro de frete
      if (dadosFrete && !todosDigitais) {
        await Frete.create({ pedidoId: pedido.id, ...dadosFrete }, { transaction: t });
      }

      // 8. Baixa de estoque (linha bloqueada na transaction — não usa coluna inexistente em produtos)
      for (const item of itensProcessados) {
        if (item.digital) continue;
        const qty = parseInt(item.quantidade, 10);
        const variacao = await VariacaoProduto.findOne({
          where: { id: item.variacaoId, produtoId: item.produtoId },
          transaction: t,
          lock: true,
        });
        if (!variacao) throw new Error(`Variação não encontrada ao baixar estoque (${item.nome}).`);
        if (variacao.estoque < qty) {
          throw new Error(`Estoque esgotado para "${item.nome}" durante a finalização.`);
        }
        await variacao.update({ estoque: variacao.estoque - qty }, { transaction: t });
      }

      // 9. Commit — tudo OK
      await t.commit();
      console.log(`[PEDIDO] ✅ Pedido #${pedido.id} criado com sucesso | status: ${pedido.status}`);
      console.log(`${'─'.repeat(60)}\n`);

      return pedido;

    } catch (error) {
      await t.rollback();
      console.error(`[PEDIDO] ❌ ERRO — rollback aplicado: ${error.message}`);
      console.log(`${'─'.repeat(60)}\n`);
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ATUALIZAR STATUS
  // ─────────────────────────────────────────────────────────────────────────────
  async atualizarStatusPedido(pedidoId, status) {
    console.log(`[PEDIDO] 🔄 Atualizando pedido #${pedidoId} → status "${status}"`);

    // Restringe atributos do JOIN para evitar conflito de colunas (underscored vs camelCase)
    const pedido = await Pedido.findByPk(pedidoId, {
      include: [{ model: Usuario, attributes: ['id', 'nome', 'email'] }],
    });
    if (!pedido) throw new Error("Pedido não encontrado");

    const eraCancelado = pedido.status === "cancelado";

    // Decrementa cupom ao cancelar (apenas uma vez — se não estava já cancelado)
    if (!eraCancelado && status === "cancelado" && pedido.cupomAplicadoId) {
      try {
        await cupomService.decrementarUso(pedido.cupomAplicadoId);
      } catch (cupomErr) {
        console.warn(`[PEDIDO] ⚠️  Erro ao decrementar cupom: ${cupomErr.message}`);
      }
    }

    pedido.status = status;
    await pedido.save();
    console.log(`[PEDIDO] ✅ Pedido #${pedidoId} atualizado para "${status}"`);

    // Notificação por e-mail — nunca deve bloquear a resposta
    try {
      await notificacaoService.enviarAtualizacaoStatus(pedidoId, status);
    } catch (emailError) {
      console.warn(`[PEDIDO] ⚠️  Notificação de status não enviada: ${emailError.message}`);
    }

    if (status === "pago") {
      try {
        await enviarEmail(pedido.Usuario?.email, "Pedido Confirmado", templateConfirmacaoPedido(pedido));
      } catch (emailErr) {
        console.warn(`[PEDIDO] ⚠️  E-mail de confirmação não enviado (${emailErr.message}) — pedido já foi salvo como "pago".`);
      }
    }

    return pedido;
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CANCELAR PEDIDO (cliente)
  // ─────────────────────────────────────────────────────────────────────────────
  async cancelarPedido(pedidoId) {
    const t = await sequelize.transaction();
    try {
      const pedido = await Pedido.findByPk(pedidoId, { transaction: t });
      if (!pedido) throw new Error("Pedido não encontrado");
      if (pedido.status === "entregue") throw new Error("Não é possível cancelar um pedido já entregue.");
      if (pedido.status === "cancelado") throw new Error("Pedido já está cancelado.");

      // Devolver cupom
      if (pedido.cupomAplicadoId) {
        await cupomService.decrementarUso(pedido.cupomAplicadoId, t);
      }

      // Restaurar estoque (sem literal SQL — mesmo caminho da baixa no pedido)
      for (const item of pedido.itens) {
        if (item.digital || !item.variacaoId) continue;
        const qty = parseInt(item.quantidade, 10);
        if (!Number.isFinite(qty) || qty < 1) continue;
        const variacao = await VariacaoProduto.findOne({
          where: { id: item.variacaoId, produtoId: item.produtoId },
          transaction: t,
          lock: true,
        });
        if (!variacao || variacao.digital) continue;
        await variacao.update({ estoque: variacao.estoque + qty }, { transaction: t });
      }

      pedido.status = "cancelado";
      await pedido.save({ transaction: t });
      await t.commit();
      return pedido;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LISTAR PEDIDOS (admin + cliente) — com batch load para evitar N+1
  // ─────────────────────────────────────────────────────────────────────────────
  async listarPedidos(usuarioId, filtros = {}) {
    const { status, page = 1, limit = 10 } = filtros;
    const where = {};
    if (usuarioId != null) where.usuarioId = usuarioId;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Pedido.findAndCountAll({
      where,
      include: [{ model: Usuario, attributes: ["nome", "email"] }],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    // Coletar todos os produtoIds únicos de todos os pedidos — batch único
    const allProdutoIds = new Set();
    rows.forEach(p => (p.itens || []).forEach(i => allProdutoIds.add(i.produtoId)));

    const produtosMap = {};
    if (allProdutoIds.size > 0) {
      const produtos = await Produto.findAll({
        where: { id: { [Op.in]: [...allProdutoIds] } },
        include: [{ model: ArquivoProduto, as: 'ArquivoProdutos' }],
      });
      produtos.forEach(p => { produtosMap[p.id] = p; });
    }

    const pedidosComDetalhes = rows.map(pedido => {
      const itensComDetalhes = (pedido.itens || []).map(item => {
        const produto = produtosMap[item.produtoId];
        const imagemUrl = produto?.ArquivoProdutos?.[0]?.url || null;
        return {
          ...item,
          produto: { id: produto?.id || null, nome: produto?.nome || 'Produto não encontrado', imagemUrl },
        };
      });
      const json = pedido.toJSON();
      // Normaliza Usuario → usuario (minúsculo) para consistência com o frontend
      json.usuario = json.Usuario || json.usuario || null;
      delete json.Usuario;
      return { ...json, itens: itensComDetalhes };
    });

    return {
      pedidos: pedidosComDetalhes,
      total: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
    };
  },

  async buscarPedidoPorId(pedidoId) {
    // Busca pedido + usuario + pagamentos (sem Frete no JOIN para evitar conflitos de colunas)
    const pedido = await Pedido.findByPk(pedidoId, {
      include: [
        { model: Usuario, attributes: ['id', 'nome', 'email'] },
        { model: Pagamento },
      ],
    });
    if (!pedido) throw new Error("Pedido não encontrado");

    const json = pedido.toJSON();

    // Normaliza associação Usuario → usuario (minúsculo)
    json.usuario = json.Usuario || json.usuario || null;
    delete json.Usuario;

    // Busca frete separadamente (evita conflito de colunas no JOIN)
    try {
      const frete = await Frete.findOne({ where: { pedidoId } });
      if (frete) {
        json.dadosFrete = {
          name: frete.servico,
          servico: frete.servico,
          valor: parseFloat(frete.valor),
          delivery_time: frete.prazoEntrega,
          codigoRastreio: frete.codigoRastreio || null,
          statusEntrega: frete.statusEntrega,
        };
        json.valorFrete = parseFloat(frete.valor);
      }
    } catch (e) {
      console.warn('[PEDIDO] Aviso: erro ao buscar frete separado:', e.message);
    }

    // Enriquece itens com nome, imagem do produto e variação
    const itens = json.itens || [];
    if (itens.length > 0) {
      const produtoIds  = [...new Set(itens.map(i => i.produtoId).filter(Boolean))];
      const variacaoIds = [...new Set(itens.map(i => i.variacaoId).filter(Boolean))];

      const [produtos, variacoes] = await Promise.all([
        produtoIds.length > 0
          ? Produto.findAll({
              where: { id: { [Op.in]: produtoIds } },
              attributes: ['id', 'nome'],
              include: [{ model: ArquivoProduto, as: 'ArquivoProdutos', where: { tipo: 'imagem' }, required: false, limit: 1 }],
            })
          : [],
        variacaoIds.length > 0
          ? VariacaoProduto.findAll({ where: { id: { [Op.in]: variacaoIds } }, attributes: ['id', 'nome', 'preco'] })
          : [],
      ]);

      const pMap = {};
      const vMap = {};
      produtos.forEach(p => { pMap[p.id] = p; });
      variacoes.forEach(v => { vMap[v.id] = v; });

      json.itens = itens.map(item => {
        const prod = pMap[item.produtoId];
        const imagemUrl = prod?.ArquivoProdutos?.[0]?.url || null;
        return {
          ...item,
          produto:  { id: item.produtoId, nome: prod?.nome || item.nome || 'Produto removido', imagemUrl },
          variacao: item.variacaoId ? { id: item.variacaoId, nome: vMap[item.variacaoId]?.nome || item.nome || 'Variação removida' } : null,
        };
      });
    }

    return json;
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────────────────────
  async verificarSeUsuarioComprouProduto(usuarioId, produtoId) {
    const pedidos = await Pedido.findAll({
      where: {
        usuarioId,
        status: { [Op.in]: ["pago", "preparando", "enviado", "entregue", "concluido"] },
      },
      attributes: ["itens"],
    });
    return pedidos.some(p => (p.itens || []).some(i => i.produtoId === produtoId));
  },

  async listarProdutosPagosPorUsuario(usuarioId) {
    const pedidos = await Pedido.findAll({
      where: {
        usuarioId,
        status: { [Op.in]: ["pago", "preparando", "enviado", "entregue", "concluido"] },
      },
      attributes: ["itens"],
    });

    const ids = new Set();
    pedidos.forEach(p => (p.itens || []).forEach(i => ids.add(i.produtoId)));

    if (ids.size === 0) return [];

    const produtos = await Produto.findAll({
      where: { id: { [Op.in]: [...ids] } },
      include: [{ model: ArquivoProduto }],
    });

    return produtos.map(p => ({ produtoId: p.id, nome: p.nome, arquivos: p.ArquivoProdutos }));
  },

  async obterDownloadsPorUsuario(usuarioId) {
    const pedidos = await Pedido.findAll({
      where: { usuarioId, status: ['pago', 'preparando', 'enviado', 'entregue', 'concluido'] },
      attributes: ['itens'],
    });

    const digitalIds = new Set();
    pedidos.forEach(p => (p.itens || []).forEach(i => { if (i.digital) digitalIds.add(i.produtoId); }));
    if (digitalIds.size === 0) return [];

    const baseUrl = process.env.BASE_URL || 'http://localhost:3035';
    const produtos = await Produto.findAll({
      where: { id: { [Op.in]: [...digitalIds] }, ativo: true },
      include: [{
        model: ArquivoProduto, as: 'ArquivoProdutos',
        where: { [Op.or]: [{ tipo: 'arquivo' }, { tipo: 'imagem', principal: true }] },
        required: false,
      }],
      attributes: ['id', 'nome', 'slug', 'descricao'],
    });

    return produtos
      .map(produto => {
        const p = produto.toJSON();
        const arqs = p.ArquivoProdutos || [];
        const imagemPrincipal = arqs.find(a => a.tipo === 'imagem' && a.principal);
        const imagemUrl = imagemPrincipal?.url
          ? new URL(imagemPrincipal.url.replace(/\\/g, '/'), baseUrl).href
          : 'https://placehold.co/80x80.png';
        const arquivos = arqs
          .filter(a => a.tipo === 'arquivo')
          .map(a => ({
            id: a.id, nome: a.nome, url: a.url,
            fullUrl: new URL(a.url.replace(/\\/g, '/'), baseUrl).href,
            mimeType: a.mimeType, tamanho: a.tamanho,
          }));
        return { produtoId: p.id, nome: p.nome, slug: p.slug, descricao: p.descricao, imagemUrl, arquivos };
      })
      .filter(item => item.arquivos.length > 0);
  },

  async buscarProdutosRelacionados(idOuSlug, limite = 4) {
    const isNumeric = !isNaN(parseFloat(idOuSlug)) && isFinite(idOuSlug);
    const where = isNumeric ? { id: idOuSlug } : { slug: idOuSlug };
    const produtoAtual = await Produto.findOne({ where });
    if (!produtoAtual?.categoriaId) return [];

    const baseUrl = process.env.BASE_URL || 'http://localhost:3035';
    const relacionados = await Produto.findAll({
      where: { categoriaId: produtoAtual.categoriaId, id: { [Op.ne]: produtoAtual.id }, ativo: true },
      limit: parseInt(limite),
      include: [
        { model: ArquivoProduto, as: 'ArquivoProdutos', required: false },
        { model: VariacaoProduto, as: 'variacoes', required: false },
      ],
    });

    return relacionados.map(produto => {
      const p = produto.toJSON();
      p.imagens = (p.ArquivoProdutos || [])
        .filter(a => a.tipo === 'imagem')
        .sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0))
        .map(a => new URL(a.url.replace(/\\/g, '/'), baseUrl).href);
      delete p.ArquivoProdutos;
      return p;
    });
  },
};

module.exports = pedidoService;
