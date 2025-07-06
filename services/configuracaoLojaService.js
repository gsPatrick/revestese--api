const { ConfiguracaoLoja } = require("../models")

const configuracaoLojaService = {
  async obterConfiguracao(chave) {
    try {
      const config = await ConfiguracaoLoja.findOne({ where: { chave } })
      return config ? config.valor : null
    } catch (error) {
      throw error
    }
  },

  async definirConfiguracao(chave, valor, tipo = "texto", descricao = null) {
    try {
      const [config, created] = await ConfiguracaoLoja.findOrCreate({
        where: { chave },
        defaults: { valor, tipo, descricao },
      })

      if (!created) {
        config.valor = valor
        config.tipo = tipo
        if (descricao) config.descricao = descricao
        await config.save()
      }

      return config
    } catch (error) {
      throw error
    }
  },

  async obterTodasConfiguracoes() {
    try {
      const configs = await ConfiguracaoLoja.findAll({
        order: [["chave", "ASC"]],
      })

      const resultado = {}
      configs.forEach((config) => {
        let valor = config.valor

        // Converter valor baseado no tipo
        switch (config.tipo) {
          case "numero":
            valor = Number.parseFloat(valor)
            break
          case "booleano":
            valor = valor === "true"
            break
          case "json":
            try {
              valor = JSON.parse(valor)
            } catch {
              valor = null
            }
            break
        }

        resultado[config.chave] = valor
      })

      return resultado
    } catch (error) {
      throw error
    }
  },

  async atualizarConfiguracoes(configuracoes) {
    try {
      // Pega todos os tipos e descrições existentes para não perdê-los.
      const configsAtuais = await ConfiguracaoLoja.findAll({ attributes: ["chave", "tipo", "descricao"], raw: true });
      const metadataMap = new Map(configsAtuais.map(c => [c.chave, { tipo: c.tipo, descricao: c.descricao }]));

      const dadosParaSalvar = Object.entries(configuracoes).map(([chave, valor]) => {
        let valorString = valor;

        if (valor === null || valor === undefined) {
          valorString = "";
        } else if (typeof valor === "object") {
          valorString = JSON.stringify(valor);
        } else {
          valorString = String(valor);
        }

        const metadata = metadataMap.get(chave) || { tipo: "texto", descricao: "" };

        return {
          chave,
          valor: valorString,
          tipo: metadata.tipo,
          descricao: metadata.descricao
        };
      });

      await ConfiguracaoLoja.bulkCreate(dadosParaSalvar, {
        updateOnDuplicate: ["valor"] // Atualiza apenas o valor se a chave já existir
      });

      return await this.obterTodasConfiguracoes();

    } catch (error) {
      console.error("Erro ao atualizar configurações em lote com bulkCreate:", error);
      throw error;
    }
  },

  async inicializarConfiguracoesPadrao() {
    try {
      const configsPadrao = {
        // Novas configurações de Endereço de Origem
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
      }

      // Filtrar para não duplicar chaves já existentes
      const configsCompletas = {
        ...configsPadrao
      };

      for (const [chave, config] of Object.entries(configsCompletas)) {
        await this.definirConfiguracao(chave, config.valor, config.tipo, config.descricao)
      }

      return await this.obterTodasConfiguracoes()
    } catch (error) {
      throw error
    }
  },

  async obterEnderecoOrigem() {
    try {
      const chavesOrigem = [
        'ORIGEM_NOME', 'ORIGEM_TELEFONE', 'ORIGEM_EMAIL', 'ORIGEM_DOCUMENTO',
        'ORIGEM_COMPANY_DOCUMENT', 'ORIGEM_STATE_REGISTER', 'ORIGEM_CEP',
        'ORIGEM_RUA', 'ORIGEM_NUMERO', 'ORIGEM_BAIRRO', 'ORIGEM_CIDADE', 'ORIGEM_ESTADO'
      ];
      
      const configs = await ConfiguracaoLoja.findAll({
        where: { chave: chavesOrigem }
      });

      const enderecoOrigem = {};
      configs.forEach(config => {
        // Remove o prefixo 'ORIGEM_' para ter uma chave limpa
        const chaveLimpa = config.chave.replace('ORIGEM_', '').toLowerCase();
        enderecoOrigem[chaveLimpa] = config.valor;
      });

      return enderecoOrigem;

    } catch(error) {
       console.error("Erro ao obter endereço de origem:", error);
       // Retorna um objeto vazio ou lança um erro para evitar falhas silenciosas
       throw new Error("Não foi possível obter os dados do endereço de origem da loja.");
    }
  },
}

module.exports = configuracaoLojaService
