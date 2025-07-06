const { Pedido, Produto, Usuario, Pagamento, VariacaoProduto, ArquivoProduto } = require("../models")
const { Op, fn, col, where: whereFn } = require("sequelize")

const relatorioService = {
  async relatorioVendas(dataInicio, dataFim) {
    try {
      const where = {
        status: "pago",
      }

      if (dataInicio && dataFim) {
        const inicio = `${dataInicio} 00:00:00`
        const fim = `${dataFim} 23:59:59`
        where.createdAt = { [Op.between]: [inicio, fim] }
      }

      const vendas = await Pedido.findAll({
        where,
        include: [
          {
            model: Usuario,
            attributes: ["nome", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      })

      const totalVendas = vendas.reduce((acc, pedido) => acc + Number.parseFloat(pedido.total), 0)
      const quantidadePedidos = vendas.length

      // Agrupar por dia
      const vendasPorDia = {}
      vendas.forEach((pedido) => {
        const data = new Date(pedido.createdAt).toISOString().split("T")[0]
        if (!vendasPorDia[data]) {
          vendasPorDia[data] = { total: 0, quantidade: 0 }
        }
        vendasPorDia[data].total += Number.parseFloat(pedido.total)
        vendasPorDia[data].quantidade += 1
      })

      return {
        periodo: { inicio: dataInicio, fim: dataFim },
        resumo: {
          totalVendas,
          quantidadePedidos,
          ticketMedio: quantidadePedidos > 0 ? totalVendas / quantidadePedidos : 0,
        },
        vendasPorDia: Object.entries(vendasPorDia).map(([data, dados]) => ({
          data,
          ...dados,
        })),
        vendas: vendas.map((pedido) => ({
          id: pedido.id,
          data: pedido.createdAt,
          cliente: pedido.Usuario.nome,
          email: pedido.Usuario.email,
          total: pedido.total,
          itens: pedido.itens.length,
        })),
      }
    } catch (error) {
      throw error
    }
  },

  async relatorioProdutos() {
    try {
      // Produtos mais vendidos
      const produtosVendidos = await Pedido.findAll({
        where: { status: "pago" },
        attributes: ["itens"],
      })

      const contadorProdutos = {}
      produtosVendidos.forEach((pedido) => {
        pedido.itens.forEach((item) => {
          if (!contadorProdutos[item.produtoId]) {
            contadorProdutos[item.produtoId] = {
              produtoId: item.produtoId,
              nome: item.nome,
              quantidadeVendida: 0,
              totalVendas: 0,
            }
          }
          contadorProdutos[item.produtoId].quantidadeVendida += item.quantidade
          contadorProdutos[item.produtoId].totalVendas += item.preco * item.quantidade
        })
      })

      const produtosMaisVendidos = Object.values(contadorProdutos)
        .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida)
        .slice(0, 10)
        
      // Buscar detalhes completos dos produtos mais vendidos, incluindo variações
      const produtosMaisVendidosDetalhados = await Promise.all(
        produtosMaisVendidos.map(async (item) => {
          const produto = await Produto.findByPk(item.produtoId, {
            include: [
              {
                model: VariacaoProduto, 
                as: 'variacoes',
                required: false
              },
              {
                model: ArquivoProduto,
                as: 'ArquivoProdutos',
                where: { tipo: 'imagem' },
                required: false
              }
            ]
          });
          
          return {
            ...item,
            produto: produto
          };
        })
      );

      // Produtos com estoque baixo (menos de 10)
      const produtos = await Produto.findAll({
        include: [{ model: VariacaoProduto, as: 'variacoes', required: true }],
        where: { ativo: true },
      });
      // Considera estoque baixo se a primeira variação tiver estoque < 10
      const produtosEstoqueBaixo = produtos.filter(produto => {
        const variacao = produto.variacoes && produto.variacoes.length > 0 ? produto.variacoes[0] : null;
        return variacao && variacao.estoque < 10;
      });

      // Produtos sem vendas
      const todosProdutos = await Produto.findAll({
        where: { ativo: true },
        attributes: ["id", "nome", "categoria", "preco"],
        include: [
          {
            model: VariacaoProduto, 
            as: 'variacoes',
            required: false
          }
        ]
      })

      const produtosSemVendas = todosProdutos.filter((produto) => !contadorProdutos[produto.id])

      return {
        produtosMaisVendidos: produtosMaisVendidosDetalhados,
        produtosEstoqueBaixo,
        produtosSemVendas: produtosSemVendas.slice(0, 10),
        totalProdutos: todosProdutos.length,
        totalProdutosVendidos: Object.keys(contadorProdutos).length,
      }
    } catch (error) {
      throw error
    }
  },

  async relatorioClientes() {
    try {
      // Clientes que mais compraram
      const clientesTop = await Pedido.findAll({
        attributes: [
          "usuarioId",
          [fn("COUNT", col("id")), "totalPedidos"],
          [fn("SUM", col("total")), "totalGasto"],
        ],
        where: { status: "pago" },
        include: [
          {
            model: Usuario,
            attributes: ["nome", "email", "createdAt"],
          },
        ],
        group: ["usuarioId"],
        order: [[col("totalGasto"), "DESC"]],
        limit: 10,
      })

      // Novos clientes (últimos 30 dias)
      const novosClientes = await Usuario.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      })

      // Clientes ativos (fizeram pedido nos últimos 30 dias)
      const clientesAtivos = await Usuario.count({
        include: [
          {
            model: Pedido,
            where: {
              createdAt: {
                [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
            required: true,
          },
        ],
      })

      const totalClientes = await Usuario.count({ where: { ativo: true } })

      return {
        clientesTop: clientesTop.map((cliente) => ({
          usuario: cliente.Usuario,
          totalPedidos: Number.parseInt(cliente.dataValues.totalPedidos),
          totalGasto: Number.parseFloat(cliente.dataValues.totalGasto),
        })),
        resumo: {
          totalClientes,
          novosClientes,
          clientesAtivos,
          taxaRetencao: totalClientes > 0 ? (clientesAtivos / totalClientes) * 100 : 0,
        },
      }
    } catch (error) {
      throw error
    }
  },

  async relatorioFinanceiro(dataInicio, dataFim) {
    try {
      const where = {}

      if (dataInicio && dataFim) {
        const inicio = `${dataInicio} 00:00:00`
        const fim = `${dataFim} 23:59:59`
        where.createdAt = { [Op.between]: [inicio, fim] }
      }

      // Receitas
      const receitas = await Pedido.sum("total", {
        where: { ...where, status: "pago" },
      })

      // Pedidos por status
      const pedidosPorStatus = await Pedido.findAll({
        attributes: ["status", [fn("COUNT", col("id")), "quantidade"]],
        where,
        group: ["status"],
      })

      // Métodos de pagamento
      const pagamentosPorMetodo = await Pagamento.findAll({
        attributes: ["metodo", [fn("COUNT", col("id")), "quantidade"]],
        where: { ...where, status: "aprovado" },
        group: ["metodo"],
      })

      return {
        periodo: { inicio: dataInicio, fim: dataFim },
        receitas: Number.parseFloat(receitas || 0),
        pedidosPorStatus: pedidosPorStatus.map((item) => ({
          status: item.status,
          quantidade: Number.parseInt(item.dataValues.quantidade),
        })),
        pagamentosPorMetodo: pagamentosPorMetodo.map((item) => ({
          metodo: item.metodo,
          quantidade: Number.parseInt(item.dataValues.quantidade),
        })),
      }
    } catch (error) {
      throw error
    }
  },
}

module.exports = relatorioService
