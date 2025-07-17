// src/services/cupomService.js

const { Cupom, Pedido, Usuario } = require("../models"); // Importar Pedido e Usuario
const { Op, fn, col, literal } = require("sequelize"); // Importar operadores do Sequelize

const cupomService = {
 async criarCupom(dados) {
    try {
      if (dados.isPrincipal) {
        await Cupom.update({ isPrincipal: false }, { where: { isPrincipal: true } });
      }
      const cupom = await Cupom.create(dados);
      return cupom;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields.isPrincipal) {
        throw new Error("Já existe um cupom marcado como principal. Por favor, desative-o antes de marcar outro.");
      }
      throw error;
    }
  },
  /**
   * --- MUDANÇA CRÍTICA AQUI ---
   * Esta função agora é SOMENTE para validação (leitura).
   * Ela verifica se um cupom pode ser usado, mas NÃO incrementa seu uso.
   * @returns {Promise<Cupom>} O objeto Cupom validado.
   * @throws {Error} Se o cupom for inválido.
   */
  async validarCupom(codigo, totalPedido, quantidadeItens, usuarioId = null) {
    try {
      const cupom = await Cupom.findOne({
        where: {
          codigo,
          ativo: true,
          validade: { [Op.gte]: new Date() },
        },
      });

      if (!cupom) {
        throw new Error("Cupom inválido ou expirado.");
      }

      // Verifica se o limite de uso JÁ foi atingido.
      if (cupom.usoAtual >= cupom.usoMaximo) {
        throw new Error("Este cupom já atingiu o limite máximo de usos.");
      }

      // Regras Específicas
      switch (cupom.tipoRegra) {
        case "primeira_compra":
          if (!usuarioId) throw new Error("Este cupom é exclusivo para novos clientes. Faça login para usá-lo.");
          const pedidosAnteriores = await Pedido.count({
            where: { usuarioId, status: { [Op.in]: ["pago", "processando", "enviado", "entregue"] } },
          });
          if (pedidosAnteriores > 0) throw new Error("Este cupom é válido apenas para sua primeira compra.");
          break;

        case "valor_minimo_pedido":
          if (totalPedido < cupom.valorMinimoPedido) throw new Error(`Este cupom é válido para pedidos acima de R$ ${parseFloat(cupom.valorMinimoPedido).toFixed(2).replace('.', ',')}.`);
          break;

        case "quantidade_minima_produtos":
          if (quantidadeItens < cupom.quantidadeMinimaProdutos) throw new Error(`Este cupom é válido para compras com ${cupom.quantidadeMinimaProdutos} ou mais produtos.`);
          break;
        
        case "social_media": case "geral": default:
          break;
      }

      // Se todas as validações passaram, retorna o objeto do cupom para cálculo do desconto.
      return cupom;
    } catch (error) {
      console.error("Erro na validação do cupom (leitura):", error.message);
      throw error;
    }
  },

/**
   * Incrementa o contador de uso de um cupom.
   * Chamado APENAS quando um pedido é criado com sucesso.
   */
  async incrementarUso(cupomId) {
    try {
      // Usamos o método 'increment' do Sequelize para uma operação atômica.
      await Cupom.increment('usoAtual', { by: 1, where: { id: cupomId } });
      console.log(`Uso do cupom ID ${cupomId} incrementado.`);
    } catch (error) {
      console.error("Erro ao incrementar uso do cupom:", error.message);
    }
  },

  /**
   * Decrementa o contador de uso de um cupom.
   * Chamado quando um pedido é cancelado.
   */
  async decrementarUso(cupomId) {
    try {
      // Usamos o método 'decrement' do Sequelize.
      await Cupom.decrement('usoAtual', { by: 1, where: { id: cupomId, usoAtual: { [Op.gt]: 0 } } });
      console.log(`Uso do cupom ID ${cupomId} decrementado.`);
    } catch (error) {
      console.error("Erro ao decrementar uso do cupom:", error.message);
    }
  },
  

  /**
   * Incrementa o contador de uso de um cupom.
   * Chamado quando o pedido é criado e seu status é pendente/processamento inicial.
   * @param {number} cupomId - ID do cupom.
   */
  async incrementarUso(cupomId) {
    try {
      const cupom = await Cupom.findByPk(cupomId);
      if (cupom) {
        cupom.usoAtual = cupom.usoAtual + 1;
        await cupom.save();
        console.log(`Uso do cupom ${cupom.codigo} incrementado. Novo usoAtual: ${cupom.usoAtual}`);
      }
    } catch (error) {
      console.error("Erro ao incrementar uso do cupom:", error.message);
    }
  },

  /**
   * Decrementa o contador de uso de um cupom.
   * Chamado quando um pedido é cancelado.
   * @param {number} cupomId - ID do cupom.
   */
  async decrementarUso(cupomId) {
    try {
      const cupom = await Cupom.findByPk(cupomId);
      if (cupom && cupom.usoAtual > 0) {
        cupom.usoAtual = cupom.usoAtual - 1;
        await cupom.save();
        console.log(`Uso do cupom ${cupom.codigo} decrementado. Novo usoAtual: ${cupom.usoAtual}`);
      }
    } catch (error) {
      console.error("Erro ao decrementar uso do cupom:", error.message);
    }
  },

  async listarCupons(filtros = {}) {
    try {
      const where = {};
      if (filtros.ativo !== undefined) where.ativo = filtros.ativo;
      if (filtros.invisivel !== undefined) where.invisivel = filtros.invisivel; // Filtra por invisibilidade

      const cupons = await Cupom.findAll({
        where,
        order: [["createdAt", "DESC"]],
      });
      return cupons;
    } catch (error) {
      console.error("Erro ao listar cupons:", error.message);
      throw error;
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
      console.error("Erro ao buscar cupom:", error.message);
      throw error;
    }
  },

  async atualizarCupom(id, dados) {
    try {
      const cupom = await this.buscarCupomPorId(id);

      // Garante que só um cupom seja principal por vez ao atualizar
      if (dados.isPrincipal && cupom.isPrincipal !== dados.isPrincipal) { // Só se isPrincipal foi alterado para true
        await Cupom.update({ isPrincipal: false }, { 
          where: { isPrincipal: true, id: { [Op.ne]: id } } 
        });
      }

      await cupom.update(dados);
      return cupom;
    } catch (error) {
      console.error("Erro ao atualizar cupom:", error.message);
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields.isPrincipal) {
        throw new Error("Já existe um cupom marcado como principal. Por favor, desative-o antes de marcar outro.");
      }
      throw error;
    }
  },

  async excluirCupom(id) {
    try {
      const cupom = await this.buscarCupomPorId(id);
      await cupom.destroy();
      return { mensagem: "Cupom excluído com sucesso" };
    } catch (error) {
      console.error("Erro ao excluir cupom:", error.message);
      throw error;
    }
  },

  /**
   * Busca o cupom marcado como principal.
   * @returns {Promise<Cupom|null>} O cupom principal ou null se nenhum for encontrado.
   */
  async obterCupomPrincipal() {
    try {
      const cupomPrincipal = await Cupom.findOne({
        where: { isPrincipal: true, ativo: true, validade: { [Op.gte]: new Date() } },
      });
      return cupomPrincipal;
    } catch (error) {
      console.error("Erro ao obter cupom principal:", error.message);
      throw error;
    }
  }
};

module.exports = cupomService;