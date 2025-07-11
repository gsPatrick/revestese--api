// src/controllers/cupomController.js

const cupomService = require("../services/cupomService")

const cupomController = {
  async criarCupom(req, res, next) {
    try {
      const cupom = await cupomService.criarCupom(req.body)
      res.status(201).json(cupom)
    } catch (error) {
      next(error)
    }
  },

   async validarCupom(req, res, next) {
    try {
      const { codigo, total, quantidadeItens } = req.body;
      // ALTERAÇÃO AQUI: Usando req.user para padronizar com o middleware verifyToken
      const usuarioId = req.user ? req.user.id : null; 

      if (!codigo || total === undefined || quantidadeItens === undefined) {
        return res.status(400).json({ erro: "Código, total e quantidade de itens são obrigatórios para validação." });
      }

      const cupom = await cupomService.validarCupom(codigo, total, quantidadeItens, usuarioId);
      
      // Calcular o desconto para retornar ao frontend
      let desconto = 0;
      if (cupom.tipo === "percentual") {
          desconto = (total * cupom.valor) / 100;
      } else {
          desconto = cupom.valor;
      }
      const novoTotal = Math.max(0, total - desconto);


      res.json({
        valido: true,
        cupom: {
          codigo: cupom.codigo,
          valor: parseFloat(cupom.valor),
          tipo: cupom.tipo,
          descontoCalculado: parseFloat(desconto.toFixed(2)),
          novoTotalCalculado: parseFloat(novoTotal.toFixed(2)),
        },
      })
    } catch (error) {
      res.status(400).json({
        valido: false,
        erro: error.message,
      })
    }
  },

  async listarCupons(req, res, next) {
    try {
      const filtros = req.query; // Pode conter { ativo, invisivel }
      const cupons = await cupomService.listarCupons(filtros)
      res.json(cupons)
    } catch (error) {
      next(error)
    }
  },

  async aplicarCupom(req, res, next) {
    try {
      const { codigo, total, quantidadeItens } = req.body;
      // ALTERAÇÃO AQUI: Usando req.user para padronizar
      const usuarioId = req.user ? req.user.id : null;

      if (!codigo || total === undefined || quantidadeItens === undefined) {
        return res.status(400).json({ erro: "Código, total e quantidade de itens são obrigatórios" });
      }
      
      const resultado = await cupomService.aplicarCupom({ total, quantidadeItens, usuarioId }, codigo);
      res.json(resultado)
    } catch (error) {
      res.status(400).json({
        valido: false,
        erro: error.message,
      })
    }
  },

  async buscarCupom(req, res, next) {
    try {
      const { id } = req.params
      const cupom = await cupomService.buscarCupomPorId(id)
      res.json(cupom)
    } catch (error) {
      next(error)
    }
  },

  async atualizarCupom(req, res, next) {
    try {
      const { id } = req.params
      const cupom = await cupomService.atualizarCupom(id, req.body)
      res.json(cupom)
    } catch (error) {
      next(error)
    }
  },

  async excluirCupom(req, res, next) {
    try {
      const { id } = req.params
      const resultado = await cupomService.excluirCupom(id)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  // NOVO: Endpoint para obter o cupom principal
  async obterCupomPrincipal(req, res, next) {
    try {
      const cupom = await cupomService.obterCupomPrincipal();
      if (!cupom) {
        return res.status(200).json({ cupomPrincipal: null, mensagem: "Nenhum cupom principal ativo encontrado." });
      }
      res.json({ cupomPrincipal: cupom });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = cupomController