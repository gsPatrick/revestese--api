const { Acesso, CarrinhoAbandonado, Produto } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

const analyticsController = {

  // POST /api/analytics/pageview  (público, sem auth)
  async trackPageview(req, res) {
    try {
      const { tipo, url, produtoId, sessionId, referrer } = req.body;
      const userId = req.usuario?.id || null;
      await Acesso.create({ tipo: tipo || 'outro', url, produtoId: produtoId || null, sessionId, userId, referrer });
      res.status(200).json({ ok: true });
    } catch { res.status(200).json({ ok: true }); } // never fail the client
  },

  // POST /api/analytics/carrinho  (público)
  async trackCarrinho(req, res) {
    try {
      const { sessionId, userId, itens, total } = req.body;
      if (!itens || itens.length === 0) return res.status(200).json({ ok: true });

      // Upsert by sessionId
      const existing = await CarrinhoAbandonado.findOne({ where: { sessionId, convertido: false } });
      if (existing) {
        await existing.update({ itens, total: total || 0 });
      } else {
        await CarrinhoAbandonado.create({ sessionId, userId: userId || null, itens, total: total || 0 });
      }
      res.status(200).json({ ok: true });
    } catch { res.status(200).json({ ok: true }); }
  },

  // PUT /api/analytics/carrinho/convertido  (público - chamado ao finalizar pedido)
  async marcarConvertido(req, res) {
    try {
      const { sessionId } = req.body;
      await CarrinhoAbandonado.update({ convertido: true }, { where: { sessionId } });
      res.status(200).json({ ok: true });
    } catch { res.status(200).json({ ok: true }); }
  },

  // GET /api/analytics/acessos?periodo=dia|semana|mes  (admin)
  async getAcessos(req, res, next) {
    try {
      const { periodo = 'semana' } = req.query;
      const agora = new Date();
      let inicio;

      if (periodo === 'dia') {
        inicio = new Date(agora); inicio.setDate(agora.getDate() - 7);
      } else if (periodo === 'mes') {
        inicio = new Date(agora); inicio.setMonth(agora.getMonth() - 3);
      } else {
        inicio = new Date(agora); inicio.setDate(agora.getDate() - 30);
      }

      const registros = await Acesso.findAll({
        attributes: ['createdAt', 'tipo'],
        where: { createdAt: { [Op.gte]: inicio } },
        raw: true,
      });

      // Agrupar por dia
      const porDia = {};
      registros.forEach(r => {
        const dia = new Date(r.createdAt).toISOString().split('T')[0];
        if (!porDia[dia]) porDia[dia] = { data: dia, total: 0, produto: 0, catalogo: 0, home: 0 };
        porDia[dia].total++;
        if (r.tipo === 'produto') porDia[dia].produto++;
        else if (r.tipo === 'catalogo') porDia[dia].catalogo++;
        else if (r.tipo === 'home') porDia[dia].home++;
      });

      // Totais por tipo
      const porTipo = {};
      registros.forEach(r => {
        const t = r.tipo || 'outro';
        porTipo[t] = (porTipo[t] || 0) + 1;
      });

      res.json({
        porDia: Object.values(porDia).sort((a, b) => a.data.localeCompare(b.data)),
        porTipo: Object.entries(porTipo).map(([tipo, total]) => ({ tipo, total })),
        totalPeriodo: registros.length,
      });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/produtos-vistos  (admin)
  async getProdutosVistos(req, res, next) {
    try {
      const registros = await Acesso.findAll({
        attributes: ['produtoId'],
        where: { tipo: 'produto', produtoId: { [Op.ne]: null } },
        raw: true,
      });

      const contagem = {};
      registros.forEach(r => {
        contagem[r.produtoId] = (contagem[r.produtoId] || 0) + 1;
      });

      const top = Object.entries(contagem)
        .map(([id, views]) => ({ produtoId: parseInt(id), views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 15);

      // Enriquecer com nomes
      const enriched = await Promise.all(top.map(async item => {
        const p = await Produto.findByPk(item.produtoId, { attributes: ['id', 'nome'] });
        return { ...item, nome: p?.nome || `Produto #${item.produtoId}` };
      }));

      res.json(enriched);
    } catch (err) { next(err); }
  },

  // GET /api/analytics/carrinhos-abandonados  (admin)
  async getCarrinhosAbandonados(req, res, next) {
    try {
      const abandonados = await CarrinhoAbandonado.findAll({
        where: { convertido: false },
        order: [['createdAt', 'DESC']],
        limit: 50,
        raw: true,
      });

      // Agrupar produtos mais abandonados
      const produtosContagem = {};
      abandonados.forEach(c => {
        (c.itens || []).forEach(item => {
          const k = item.produtoId || item.id;
          if (!produtosContagem[k]) produtosContagem[k] = { nome: item.nome || `#${k}`, vezes: 0 };
          produtosContagem[k].vezes += item.quantidade || 1;
        });
      });

      const topAbandonados = Object.values(produtosContagem)
        .sort((a, b) => b.vezes - a.vezes)
        .slice(0, 10);

      res.json({
        lista: abandonados,
        totalAbandonados: abandonados.length,
        totalValor: abandonados.reduce((s, c) => s + Number(c.total || 0), 0),
        produtosMaisAbandonados: topAbandonados,
      });
    } catch (err) { next(err); }
  },
};

module.exports = analyticsController;
