const { Pedido, Produto, Cupom, Usuario, Frete } = require("../models")
const { Op, fn, col } = require("sequelize")
const relatorioService = require("../services/relatorioService")

const relatorioController = {
  async vendasPorPeriodo(req, res, next) {
    try {
      const { dataInicio, dataFim } = req.query
      const result = await relatorioService.relatorioVendas(dataInicio, dataFim)
      res.json(result)
    } catch (error) {
      next(error)
    }
  },

  async produtosMaisVendidos(req, res, next) {
    try {
      const { periodo, limite } = req.query
      const result = await relatorioService.relatorioProdutos()
      const produtos = result.produtosMaisVendidos
        .slice(0, parseInt(limite) || result.produtosMaisVendidos.length)
        .map(p => ({
          id: p.produtoId,
          nome: p.nome,
          totalVendido: p.quantidadeVendida,
          valorTotal: p.totalVendas,
        }))
      res.json({ produtos })
    } catch (error) {
      next(error)
    }
  },

  async desempenhoCupons(req, res, next) {
    try {
      const cupons = await Cupom.findAll({
        attributes: [
          'id',
          'codigo',
          'tipo',
          'valor',
          'validade',
          'usoMaximo',
          'usoAtual'
        ]
      })

      // Buscar dados de uso
      const dadosUso = await Pedido.findAll({
        attributes: [
          'cupomAplicado',
          [fn('COUNT', col('id')), 'totalPedidos'],
          [fn('SUM', col('desconto')), 'totalDesconto'],
          [fn('SUM', col('total')), 'totalVendas']
        ],
        where: {
          cupomAplicado: {
            [Op.not]: null
          },
          status: {
            [Op.notIn]: ['cancelado', 'devolvido']
          }
        },
        group: ['cupomAplicado']
      })

      // Mapear dados de uso para os cupons
      const desempenhoCupons = cupons.map(cupom => {
        const dadosCupom = dadosUso.find(d => d.cupomAplicado === cupom.codigo)

        return {
          id: cupom.id,
          codigo: cupom.codigo,
          tipo: cupom.tipo,
          valor: cupom.valor,
          validade: cupom.validade,
          usoMaximo: cupom.usoMaximo,
          usoAtual: cupom.usoAtual,
          desempenho: dadosCupom ? {
            totalPedidos: parseInt(dadosCupom.get('totalPedidos')),
            totalDesconto: parseFloat(dadosCupom.get('totalDesconto')),
            totalVendas: parseFloat(dadosCupom.get('totalVendas')),
            conversao: cupom.usoAtual > 0 ?
              (parseInt(dadosCupom.get('totalPedidos')) / cupom.usoAtual) * 100 : 0
          } : {
            totalPedidos: 0,
            totalDesconto: 0,
            totalVendas: 0,
            conversao: 0
          }
        }
      })

      res.json(desempenhoCupons)
    } catch (error) {
      next(error)
    }
  },

  async clientesMaisAtivos(req, res, next) {
    try {
      const { limite = 10 } = req.query
      const { clientesTop } = await relatorioService.relatorioClientes()
      const clientes = clientesTop
        .slice(0, parseInt(limite))
        .map(c => ({
          id: c.usuario.id,
          nome: c.usuario.nome,
          email: c.usuario.email,
          pedidos: c.totalPedidos,
          valorTotal: c.totalGasto,
        }))
      res.json(clientes)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = relatorioController
