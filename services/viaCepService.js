// src/services/viaCepService.js

const axios = require("axios");

const viaCepService = {
  /**
   * Busca um endereço por CEP usando a BrasilAPI (alternativa rápida ao ViaCEP).
   * @param {string} cep - O CEP a ser consultado.
   * @returns {Promise<object>} - O objeto de endereço formatado.
   */
  async buscarEnderecoPorCep(cep) {
    try {
      // Remover caracteres não numéricos
      const cepLimpo = cep.replace(/\D/g, "");

      // Validar formato do CEP
      if (cepLimpo.length !== 8) {
        throw new Error("CEP deve ter 8 dígitos");
      }

      // --- MUDANÇA PRINCIPAL: USANDO BRASILAPI ---
      const response = await axios.get(`https://brasilapi.com.br/api/cep/v1/${cepLimpo}`);
      
      // A BrasilAPI retorna um erro 404 se o CEP não for encontrado,
      // que será capturado pelo bloco catch abaixo.

      // Mapeamento dos campos da BrasilAPI para o formato esperado pelo seu sistema
      return {
        cep: response.data.cep,
        rua: response.data.street,
        bairro: response.data.neighborhood,
        cidade: response.data.city,
        estado: response.data.state,
        complemento: "", // BrasilAPI não fornece complemento, mas mantemos o campo
        ibge: response.data.ibge,
        gia: response.data.gia,
        ddd: null, // BrasilAPI não retorna DDD no endpoint de CEP
        siafi: null, // BrasilAPI não retorna SIAFI no endpoint de CEP
      };

    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("CEP não encontrado");
      }
      // Captura erros de rede (como ETIMEDOUT) ou outros erros da API
      console.error("Erro ao consultar a BrasilAPI:", error.message);
      throw new Error("Erro ao buscar CEP: " + error.message);
    }
  },

  /**
   * Valida se um CEP existe.
   * @param {string} cep - O CEP a ser validado.
   * @returns {Promise<boolean>} - True se o CEP for válido, false caso contrário.
   */
  async validarCep(cep) {
    try {
      await this.buscarEnderecoPorCep(cep);
      return true;
    } catch (error) {
      return false;
    }
  },
};

module.exports = viaCepService;