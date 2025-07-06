const { Cupom } = require("../models")
const { Op, sequelize } = require("sequelize")

const cupomService = {
  async criarCupom(dados) {
    try {
      const cupom = await Cupom.create(dados)
      return cupom
    } catch (error) {
      throw error
    }
  },

  async validarCupom(codigo) {
    try {
      const cupom = await Cupom.findOne({
        where: {
          codigo,
          ativo: true,
          validade: { [Op.gte]: new Date() },
          usoAtual: { [Op.lt]: sequelize.col("usoMaximo") },
        },
      })

      if (!cupom) {
        throw new Error("Cupom inválido ou expirado")
      }

      return cupom
    } catch (error) {
      throw error
    }
  },

  async aplicarCupom(pedido, codigo) {
    try {
      const cupom = await this.validarCupom(codigo)

      let desconto = 0
      if (cupom.tipo === "percentual") {
        desconto = (pedido.total * cupom.valor) / 100
      } else {
        desconto = cupom.valor
      }

      const novoTotal = Math.max(0, pedido.total - desconto)

      // Incrementar uso do cupom
      cupom.usoAtual += 1
      await cupom.save()

      return {
        total: novoTotal,
        desconto,
        cupomAplicado: codigo,
      }
    } catch (error) {
      throw error
    }
  },

  async listarCupons() {
    try {
      const cupons = await Cupom.findAll({
        where: { ativo: true },
        order: [["createdAt", "DESC"]],
      })

      return cupons
    } catch (error) {
      throw error
    }
  },

  async buscarCupomPorId(id) {
    try {
      const cupom = await Cupom.findByPk(id);
      if (!cupom) {
        throw new Error("Cupom não encontrado");
      }
      return cupom;
    } catch (error) {
      throw error;
    }
  },

  async atualizarCupom(id, dados) {
    try {
      const cupom = await this.buscarCupomPorId(id);
      await cupom.update(dados);
      return cupom;
    } catch (error) {
      throw error;
    }
  },

  async excluirCupom(id) {
    try {
      const cupom = await this.buscarCupomPorId(id);
      await cupom.destroy();
      return { mensagem: "Cupom excluído com sucesso" };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = cupomService
