// src/services/configuracaoLojaService.js

const { ConfiguracaoLoja } = require("../models")

// Lista de chaves que podem ser lidas do ambiente como fallback.
// Isso evita que outras variáveis de ambiente sensíveis (como senhas de banco) sejam expostas.
const CHAVES_AMBIENTE_PERMITIDAS = [
  'ORIGEM_NOME', 'ORIGEM_TELEFONE', 'ORIGEM_EMAIL', 'ORIGEM_DOCUMENTO',
  'ORIGEM_COMPANY_DOCUMENT', 'ORIGEM_STATE_REGISTER', 'ORIGEM_CEP',
  'ORIGEM_RUA', 'ORIGEM_NUMERO', 'ORIGEM_BAIRRO', 'ORIGEM_CIDADE', 'ORIGEM_ESTADO'
  // Adicione aqui outras chaves de configuração que você queira que tenham um padrão no .env
];


const configuracaoLojaService = {

  /**
   * Obtém o valor de uma única configuração.
   * Prioridade: 1º Banco de Dados, 2º Variável de Ambiente.
   * @param {string} chave - A chave da configuração (ex: 'ORIGEM_NOME').
   * @returns {string|null} - O valor da configuração ou null se não for encontrado em lugar nenhum.
   */
  async obterConfiguracao(chave) {
    try {
      // 1. Tenta buscar no banco de dados primeiro
      const configDB = await ConfiguracaoLoja.findOne({ where: { chave } });
      if (configDB && configDB.valor) {
        return configDB.valor;
      }

      // 2. Se não encontrou no banco, tenta buscar nas variáveis de ambiente (se permitido)
      if (CHAVES_AMBIENTE_PERMITIDAS.includes(chave) && process.env[chave]) {
        return process.env[chave];
      }

      // 3. Se não encontrou em lugar nenhum, retorna null
      return null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Define/salva uma configuração NO BANCO DE DADOS.
   * Isso sobrepõe o valor da variável de ambiente.
   */
  async definirConfiguracao(chave, valor, tipo = "texto", descricao = null) {
    try {
      const [config, created] = await ConfiguracaoLoja.findOrCreate({
        where: { chave },
        defaults: { valor: String(valor), tipo, descricao },
      });

      if (!created) {
        config.valor = String(valor);
        config.tipo = tipo;
        if (descricao) config.descricao = descricao;
        await config.save();
      }

      return config;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtém TODAS as configurações da loja, mesclando dados do banco e do ambiente.
   * O banco de dados sempre tem prioridade.
   */
  async obterTodasConfiguracoes() {
    try {
      // 1. Pega todas as configurações do banco de dados
      const configsDB = await ConfiguracaoLoja.findAll({
        order: [["chave", "ASC"]],
      });

      const resultado = {};

      // 2. Processa as configurações do banco, dando prioridade a elas
      configsDB.forEach((config) => {
        let valor = config.valor;
        // Lógica de conversão de tipo para JSON, booleano, etc.
        switch (config.tipo) {
          case "numero":
            valor = Number.parseFloat(valor) || 0;
            break;
          case "booleano":
            valor = valor === "true";
            break;
          case "json":
            try {
              valor = JSON.parse(valor);
            } catch {
              valor = null;
            }
            break;
        }
        resultado[config.chave] = valor;
      });

      // 3. Itera sobre as chaves permitidas e usa o valor do ambiente como FALLBACK
      CHAVES_AMBIENTE_PERMITIDAS.forEach(chave => {
        // Se a chave AINDA NÃO foi definida pelo banco E existe no ambiente...
        if (resultado[chave] === undefined && process.env[chave] !== undefined) {
          resultado[chave] = process.env[chave];
        }
      });
      
      return resultado;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza múltiplas configurações no banco de dados.
   * Esta função não precisa mudar, pois seu propósito é salvar no banco.
   */
  async atualizarConfiguracoes(configuracoes) {
    try {
      const configsAtuais = await ConfiguracaoLoja.findAll({ attributes: ["chave", "tipo", "descricao"], raw: true });
      const metadataMap = new Map(configsAtuais.map(c => [c.chave, { tipo: c.tipo, descricao: c.descricao }]));

      const dadosParaSalvar = Object.entries(configuracoes).map(([chave, valor]) => {
        let valorString = (valor === null || valor === undefined) ? "" : typeof valor === "object" ? JSON.stringify(valor) : String(valor);
        const metadata = metadataMap.get(chave) || { tipo: "texto", descricao: "" };
        return { chave, valor: valorString, tipo: metadata.tipo, descricao: metadata.descricao };
      });

      await ConfiguracaoLoja.bulkCreate(dadosParaSalvar, {
        updateOnDuplicate: ["valor"]
      });

      return await this.obterTodasConfiguracoes();
    } catch (error) {
      console.error("Erro ao atualizar configurações em lote com bulkCreate:", error);
      throw error;
    }
  },

  /**
   * Cria as entradas no banco de dados pela primeira vez se não existirem.
   * Útil para popular a UI do painel admin.
   */
  async inicializarConfiguracoesPadrao() {
    try {
      const configsPadrao = {
        ORIGEM_NOME: { valor: "Nome da Sua Loja", tipo: "texto", descricao: "Nome do Remetente (Sua Loja)" },
        ORIGEM_TELEFONE: { valor: "11999999999", tipo: "texto", descricao: "Telefone do Remetente" },
        ORIGEM_EMAIL: { valor: "seu-email@loja.com", tipo: "texto", descricao: "E-mail do Remetente" },
        ORIGEM_DOCUMENTO: { valor: "000.000.000-00", tipo: "texto", descricao: "CPF do Remetente" },
        ORIGEM_COMPANY_DOCUMENT: { valor: "00.000.000/0001-00", tipo: "texto", descricao: "CNPJ do Remetente (se aplicável)" },
        ORIGEM_STATE_REGISTER: { valor: "", tipo: "texto", descricao: "Inscrição Estadual do Remetente (se aplicável)" },
        ORIGEM_CEP: { valor: "01001-000", tipo: "texto", descricao: "CEP de Origem dos Envios" },
        ORIGEM_RUA: { valor: "Praça da Sé", tipo: "texto", descricao: "Rua de Origem dos Envios" },
        ORIGEM_NUMERO: { valor: "s/n", tipo: "texto", descricao: "Número de Origem dos Envios" },
        ORIGEM_BAIRRO: { valor: "Sé", tipo: "texto", descricao: "Bairro de Origem dos Envios" },
        ORIGEM_CIDADE: { valor: "São Paulo", tipo: "texto", descricao: "Cidade de Origem dos Envios" },
        ORIGEM_ESTADO: { valor: "SP", tipo: "texto", descricao: "Estado (UF) de Origem dos Envios" },
      };

      for (const [chave, config] of Object.entries(configsPadrao)) {
        // Usando findOrCreate para não sobrescrever o que já existe
        await ConfiguracaoLoja.findOrCreate({
          where: { chave },
          defaults: { valor: config.valor, tipo: config.tipo, descricao: config.descricao }
        });
      }

      return await this.obterTodasConfiguracoes();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtém o objeto de endereço de origem formatado para os serviços de frete.
   * Agora ele usa a lógica de fallback automaticamente.
   */
  async obterEnderecoOrigem() {
    try {
      // Pega todas as configurações já com o fallback do .env
      const todasConfigs = await this.obterTodasConfiguracoes();
      const enderecoOrigem = {};
      
      CHAVES_AMBIENTE_PERMITIDAS.forEach(chave => {
        if (chave.startsWith('ORIGEM_')) {
          const chaveLimpa = chave.replace('ORIGEM_', '').toLowerCase();
          enderecoOrigem[chaveLimpa] = todasConfigs[chave];
        }
      });

      // Validação final para garantir que dados essenciais (como CEP) estão presentes
      if (!enderecoOrigem.cep) {
        const erroMsg = "CEP de origem (ORIGEM_CEP) não foi encontrado nem no banco de dados, nem nas variáveis de ambiente. O cálculo de frete não pode continuar.";
        console.error(erroMsg);
        throw new Error(erroMsg);
      }
      
      return enderecoOrigem;
    } catch(error) {
       console.error("Erro crítico ao obter endereço de origem:", error.message);
       throw error;
    }
  },
};

module.exports = configuracaoLojaService;