const axios = require("axios")

const viaCepService = {
  async buscarEnderecoPorCep(cep) {
    try {
      // Remover caracteres não numéricos
      const cepLimpo = cep.replace(/\D/g, "")

      // Validar formato do CEP
      if (cepLimpo.length !== 8) {
        throw new Error("CEP deve ter 8 dígitos")
      }

      const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`)

      if (response.data.erro) {
        throw new Error("CEP não encontrado")
      }

      return {
        cep: response.data.cep,
        rua: response.data.logradouro,
        bairro: response.data.bairro,
        cidade: response.data.localidade,
        estado: response.data.uf,
        complemento: response.data.complemento || "",
        ibge: response.data.ibge,
        gia: response.data.gia,
        ddd: response.data.ddd,
        siafi: response.data.siafi,
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("CEP não encontrado")
      }
      throw new Error("Erro ao buscar CEP: " + error.message)
    }
  },

  async validarCep(cep) {
    try {
      await this.buscarEnderecoPorCep(cep)
      return true
    } catch (error) {
      return false
    }
  },
}

module.exports = viaCepService
