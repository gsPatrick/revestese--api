// src/services/freteService.js

const { MetodoFrete, Produto, VariacaoProduto } = require("../models");

// Função auxiliar para limpar e normalizar strings para comparação
function normalizarString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const freteService = {
 async calcularFrete(enderecoOrigem, enderecoDestino, itens) {
    try {
      console.log('=== INÍCIO CÁLCULO FRETE SERVICE ===');
      console.log('Dados recebidos (enderecoDestino):', JSON.stringify(enderecoDestino, null, 2));

      // <-- ADICIONADO: Validação para garantir que o endereço completo foi recebido -->
      // O frontend DEVE enviar o objeto de endereço completo, não apenas o CEP.
      if (!enderecoDestino || !enderecoDestino.cidade || !enderecoDestino.estado) {
        throw new Error("Dados de endereço de destino incompletos. Cidade e Estado são obrigatórios.");
      }

      // 1. Lógica para produtos digitais (mantida)
      const flagsDigitais = await Promise.all(
        itens.map(async (item) => {
          if (item.variacaoId) {
            const variacao = await VariacaoProduto.findByPk(item.variacaoId);
            return variacao?.digital || false;
          }
          return false;
        })
      );
      const todosDigitais = flagsDigitais.every(Boolean);

      if (todosDigitais) {
        console.log('Retornando apenas entrega digital.');
        return [{
          id: 'digital_delivery',
          name: 'Entrega Digital',
          price: '0.00',
          company: { name: 'Doodle Dreams' },
          delivery_time: 0,
          custom_description: 'Seu produto será entregue por e-mail e estará disponível para download na sua conta.',
        }];
      }

      // 2. Lógica para produtos FÍSICOS (mantida, mas agora mais segura)
      const cidadeNormalizada = normalizarString(enderecoDestino.cidade);
      const estadoNormalizado = normalizarString(enderecoDestino.estado);

      console.log(`Verificando: Cidade Normalizada: "${cidadeNormalizada}" | Estado Normalizado: "${estadoNormalizado}"`);
      
      let opcoesFreteFisico = [];
      
      if (cidadeNormalizada === 'presidente epitacio' && (estadoNormalizado === 'sp' || estadoNormalizado === 'sao paulo')) {
        console.log('CONDIÇÃO VERDADEIRA: Endereço de destino é Presidente Epitácio/SP. Oferecendo Frete Grátis.');
        opcoesFreteFisico.push({
          id: 'frete_gratis_local',
          name: 'Frete Grátis (Entrega Local)',
          price: '0.00',
          company: { name: 'Doodle Dreams' },
          delivery_time: 2,
          custom_description: 'Entrega grátis em Presidente Epitácio/SP.',
        });
      } else {
        console.log('CONDIÇÃO FALSA: Endereço de destino não é Presidente Epitácio/SP. Oferecendo Frete Fixo (R$ 9.90).');
        opcoesFreteFisico.push({
          id: 'frete_fixo_nacional',
          name: 'Frete Fixo (Brasil)',
          price: '9.90',
          company: { name: 'Doodle Dreams' },
          delivery_time: 7,
          custom_description: 'Valor fixo para todo o Brasil.',
        });
      }
      
      console.log('Opções de frete para produtos físicos:', JSON.stringify(opcoesFreteFisico, null, 2));
      console.log('=== FIM CÁLCULO FRETE SERVICE ===');

      return opcoesFreteFisico;

    } catch (error) {
      console.error("ERRO GERAL no serviço de frete:", error.message);
      console.error('Detalhes do erro Frete Service:', error.stack);
      throw new Error(error.message || "Não foi possível calcular o frete no momento.");
    }
  },

  // (O resto do arquivo permanece igual)

  async criarMetodoFrete(dados) {
    try {
      const novoMetodo = await MetodoFrete.create(dados);
      return novoMetodo;
    } catch (error) {
      console.error("Erro ao criar método de frete:", error.message);
      throw new Error("Erro ao criar método de frete");
    }
  },

  async listarMetodosFrete() {
    try {
      const metodos = await MetodoFrete.findAll();
      return metodos;
    } catch (error) {
      console.error("Erro ao listar métodos de frete:", error.message);
      throw new Error("Erro ao listar métodos de frete");
    }
  },

  async obterMetodoFrete(id) {
    try {
      const metodo = await MetodoFrete.findByPk(id);
      if (!metodo) {
        throw new Error("Método de frete não encontrado");
      }
      return metodo;
    } catch (error) {
      console.error("Erro ao obter método de frete:", error.message);
      throw new Error(error.message);
    }
  },

  async atualizarMetodoFrete(id, dados) {
    try {
      const metodo = await MetodoFrete.findByPk(id);
      if (!metodo) {
        throw new Error("Método de frete não encontrado");
      }

      await metodo.update(dados);
      return metodo;
    } catch (error) {
      console.error("Erro ao atualizar método de frete:", error.message);
      throw new Error(error.message);
    }
  },

  async removerMetodoFrete(id) {
    try {
      const metodo = await MetodoFrete.findByPk(id);
      if (!metodo) {
        throw new Error("Método de frete não encontrado");
      }

      await metodo.destroy();
      return { mensagem: "Método de frete removido com sucesso" };
    } catch (error) {
      console.error("Erro ao remover método de frete:", error.message);
      throw new Error(error.message);
    }
  }
};

module.exports = freteService;