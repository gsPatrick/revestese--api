const { VariacaoProduto, HistoricoEstoque, Produto, Usuario } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const estoqueController = {

  // PATCH /api/produtos/:produtoId/variacoes/:variacaoId/estoque
  // body: { delta: number, observacao?: string }
  async ajustarEstoque(req, res, next) {
    const { produtoId, variacaoId } = req.params;
    const { delta, observacao } = req.body;
    const adminId = req.usuario?.id;

    if (delta === undefined || delta === null || isNaN(Number(delta))) {
      return res.status(400).json({ erro: 'Campo "delta" obrigatório (número positivo ou negativo).' });
    }

    const deltaNum = parseInt(delta);

    const t = await sequelize.transaction();
    try {
      const variacao = await VariacaoProduto.findOne({
        where: { id: variacaoId, produtoId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!variacao) {
        await t.rollback();
        return res.status(404).json({ erro: 'Variação não encontrada.' });
      }

      const estoqueAntes = variacao.estoque;
      const estoqueDepois = Math.max(0, estoqueAntes + deltaNum);

      await variacao.update({ estoque: estoqueDepois }, { transaction: t });

      const tipo = deltaNum > 0 ? 'entrada' : 'saida';

      await HistoricoEstoque.create({
        produtoId: parseInt(produtoId),
        variacaoId: parseInt(variacaoId),
        adminId: adminId || null,
        delta: deltaNum,
        estoqueAntes,
        estoqueDepois,
        tipo,
        observacao: observacao || null,
      }, { transaction: t });

      await t.commit();

      console.log(`[ESTOQUE] Variação #${variacaoId} do produto #${produtoId} | ${estoqueAntes} → ${estoqueDepois} (delta: ${deltaNum > 0 ? '+' : ''}${deltaNum}) | admin #${adminId}`);

      res.json({ variacaoId: variacao.id, estoqueAntes, estoqueDepois, delta: deltaNum });
    } catch (err) {
      await t.rollback();
      next(err);
    }
  },

  // GET /api/produtos/:produtoId/historico-estoque
  async listarHistorico(req, res, next) {
    const { produtoId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const page  = parseInt(req.query.page)  || 1;

    try {
      const { count, rows } = await HistoricoEstoque.findAndCountAll({
        where: { produtoId },
        include: [
          { model: VariacaoProduto, as: 'variacao', attributes: ['id', 'nome'] },
          { model: Usuario,         as: 'admin',    attributes: ['id', 'nome'] },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      });

      res.json({ total: count, historico: rows });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/produtos/:produtoId/variacoes-estoque
  // Retorna todas as variações do produto com estoque atual (para o overlay)
  async listarVariacoesEstoque(req, res, next) {
    const { produtoId } = req.params;
    try {
      const variacoes = await VariacaoProduto.findAll({
        where: { produtoId, ativo: true },
        attributes: ['id', 'nome', 'estoque', 'preco', 'digital'],
        order: [['nome', 'ASC']],
      });
      res.json(variacoes);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = estoqueController;
