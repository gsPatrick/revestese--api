// src/services/cupomService.js

const { Cupom, Pedido } = require("../models");
const { Op } = require("sequelize");

const cupomService = {

  async criarCupom(dados) {
    try {
      if (dados.isPrincipal) {
        await Cupom.update({ isPrincipal: false }, { where: { isPrincipal: true } });
      }
      return await Cupom.create(dados);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields?.isPrincipal) {
        throw new Error("Já existe um cupom marcado como principal. Desative-o antes de marcar outro.");
      }
      throw error;
    }
  },

  /**
   * Validação somente-leitura do cupom.
   * NÃO incrementa uso. Apenas valida se pode ser usado.
   */
  async validarCupom(codigo, totalPedido, quantidadeItens, usuarioId = null) {
    const cupom = await Cupom.findOne({
      where: { codigo, ativo: true, validade: { [Op.gte]: new Date() } },
    });

    if (!cupom) throw new Error("Cupom inválido ou expirado.");
    if (cupom.usoAtual >= cupom.usoMaximo) throw new Error("Este cupom já atingiu o limite máximo de usos.");

    switch (cupom.tipoRegra) {
      case "primeira_compra": {
        if (!usuarioId) throw new Error("Este cupom é exclusivo para novos clientes. Faça login para usá-lo.");
        const pedidosAnteriores = await Pedido.count({
          where: { usuarioId, status: { [Op.in]: ["pago", "preparando", "enviado", "entregue"] } },
        });
        if (pedidosAnteriores > 0) throw new Error("Este cupom é válido apenas para sua primeira compra.");
        break;
      }
      case "valor_minimo_pedido":
        if (totalPedido < cupom.valorMinimoPedido)
          throw new Error(`Este cupom é válido para pedidos acima de R$ ${parseFloat(cupom.valorMinimoPedido).toFixed(2).replace('.', ',')}.`);
        break;
      case "quantidade_minima_produtos":
        if (quantidadeItens < cupom.quantidadeMinimaProdutos)
          throw new Error(`Este cupom é válido para compras com ${cupom.quantidadeMinimaProdutos} ou mais produtos.`);
        break;
      default:
        break;
    }

    return cupom;
  },

  /**
   * Incremento ATÔMICO do contador de uso.
   * Usa UPDATE com WHERE id = ? AND usoAtual < usoMaximo para garantir
   * que o limite nunca seja ultrapassado mesmo com 50 compradores simultâneos.
   * Deve ser chamado DENTRO de uma transaction já aberta.
   *
   * @returns {boolean} true se o incremento foi aplicado, false se limite atingido.
   */
  async incrementarUso(cupomId, transaction = null) {
    const [affected] = await Cupom.update(
      { usoAtual: Cupom.sequelize.literal('usoAtual + 1') },
      {
        where: {
          id: cupomId,
          usoAtual: { [Op.lt]: Cupom.sequelize.col('usoMaximo') },
        },
        transaction,
      }
    );
    if (affected === 0) {
      throw new Error("Este cupom já atingiu o limite máximo de usos.");
    }
    return true;
  },

  /**
   * Decremento ATÔMICO do contador de uso.
   * Chamado quando um pedido é cancelado. Não decrementa abaixo de zero.
   */
  async decrementarUso(cupomId, transaction = null) {
    await Cupom.update(
      { usoAtual: Cupom.sequelize.literal('GREATEST(usoAtual - 1, 0)') },
      { where: { id: cupomId }, transaction }
    );
  },

  async listarCupons(filtros = {}) {
    const where = {};
    if (filtros.ativo !== undefined) where.ativo = filtros.ativo;
    if (filtros.invisivel !== undefined) where.invisivel = filtros.invisivel;
    return Cupom.findAll({ where, order: [["createdAt", "DESC"]] });
  },

  async buscarCupomPorId(id) {
    const cupom = await Cupom.findByPk(id);
    if (!cupom) throw new Error("Cupom não encontrado");
    return cupom;
  },

  async atualizarCupom(id, dados) {
    const cupom = await this.buscarCupomPorId(id);
    if (dados.isPrincipal && !cupom.isPrincipal) {
      await Cupom.update({ isPrincipal: false }, { where: { isPrincipal: true, id: { [Op.ne]: id } } });
    }
    await cupom.update(dados);
    return cupom;
  },

  async excluirCupom(id) {
    const cupom = await this.buscarCupomPorId(id);
    await cupom.destroy();
    return { mensagem: "Cupom excluído com sucesso" };
  },

  async obterCupomPrincipal() {
    return Cupom.findOne({
      where: { isPrincipal: true, ativo: true, validade: { [Op.gte]: new Date() } },
    });
  },
};

module.exports = cupomService;
