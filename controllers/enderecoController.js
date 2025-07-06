const enderecoService = require("../services/enderecoService")
const axios = require("axios")

const enderecoController = {
  async criarEndereco(req, res, next) {
    try {
      const usuarioId = req.user.id
      const endereco = await enderecoService.criarEndereco(usuarioId, req.body)
      res.status(201).json(endereco)
    } catch (error) {
      next(error)
    }
  },

  async listarEnderecos(req, res, next) {
    try {
      const usuarioId = req.user.id
      const enderecos = await enderecoService.listarEnderecos(usuarioId)
      res.json(enderecos)
    } catch (error) {
      next(error)
    }
  },

  async buscarEndereco(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.user.id
      const endereco = await enderecoService.buscarEnderecoPorId(id, usuarioId)
      res.json(endereco)
    } catch (error) {
      next(error)
    }
  },

  async buscarPrincipal(req, res, next) {
    try {
      const usuarioId = req.user.id
      const enderecoPrincipal = await enderecoService.buscarEnderecoPrincipal(usuarioId)
      res.json(enderecoPrincipal)
    } catch (error) {
      next(error)
    }
  },

  async atualizarEndereco(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.user.id
      const endereco = await enderecoService.atualizarEndereco(id, usuarioId, req.body)
      res.json(endereco)
    } catch (error) {
      next(error)
    }
  },

  async removerEndereco(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.user.id
      const resultado = await enderecoService.removerEndereco(id, usuarioId)
      res.json(resultado)
    } catch (error) {
      next(error)
    }
  },

  async definirEnderecoPadrao(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.user.id
      const endereco = await enderecoService.definirEnderecoPrincipal(id, usuarioId)
      res.json(endereco)
    } catch (error) {
      next(error)
    }
  },

  async definirPrincipal(req, res, next) {
    try {
      const { id } = req.params
      const usuarioId = req.user.id
      const endereco = await enderecoService.definirEnderecoPrincipal(id, usuarioId)
      res.json(endereco)
    } catch (error) {
      next(error)
    }
  },

  /**
   * Validar CEP usando a API ViaCEP
   */
  async validarCep(req, res, next) {
    try {
      const { cep } = req.body

      if (!cep) {
        return res.status(400).json({ erro: "CEP é obrigatório" })
      }

      // Remover caracteres não numéricos
      const cepLimpo = cep.replace(/\D/g, '')

      if (cepLimpo.length !== 8) {
        return res.status(400).json({ erro: "CEP deve ter 8 dígitos" })
      }

      try {
        // Consultar a API ViaCEP (gratuita e sem autenticação)
        const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`)

        if (response.data.erro) {
          return res.status(404).json({ erro: "CEP não encontrado" })
        }

        // Retornar dados formatados
        res.json({
          cep: response.data.cep,
          logradouro: response.data.logradouro,
          complemento: response.data.complemento,
          bairro: response.data.bairro,
          cidade: response.data.localidade,
          estado: response.data.uf
        })
      } catch (error) {
        res.status(500).json({ erro: "Erro ao consultar o CEP" })
      }
    } catch (error) {
      next(error)
    }
  },
}

module.exports = enderecoController
