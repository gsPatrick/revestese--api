// src/services/freteService.js

const correiosService = require("./correiosService");
const { MetodoFrete, Produto, VariacaoProduto } = require("../models");

const freteService = {
  async calcularFrete(enderecoOrigem, enderecoDestino, itens) {
    try {
      console.log('=== INÍCIO CÁLCULO FRETE SERVICE ===');
      console.log('Dados recebidos (enderecoOrigem):', JSON.stringify(enderecoOrigem, null, 2));
      console.log('Dados recebidos (enderecoDestino):', JSON.stringify(enderecoDestino, null, 2));
      console.log('Dados recebidos (itens):', JSON.stringify(itens, null, 2));

      // 1. Lógica para produtos digitais
      const flagsDigitais = await Promise.all(
        itens.map(async (item) => {
          if (item.variacaoId) {
            const variacao = await VariacaoProduto.findByPk(item.variacaoId);
            if (!variacao) {
              console.warn(`Variação ${item.variacaoId} não encontrada. Tratando como físico.`);
              return false;
            }
            return variacao.digital;
          }
          // Se não tiver variação, assume que é físico (ou ajuste conforme sua regra)
          // Se o produto em si tem uma flag 'digital', você precisaria verificar Produto.findByPk(item.produtoId) aqui.
          // Assumindo que produtos SEM variação são físicos por padrão no seu sistema atual.
          console.warn(`Item ${item.produtoId} sem variaçãoId. Tratando como físico.`);
          return false;
        })
      );

      const todosDigitais = flagsDigitais.every(Boolean);
      console.log('Todos os itens são digitais?', todosDigitais);

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

      // 2. Lógica para produtos FÍSICOS: Frete Fixo / Frete Grátis Condicional
      // Se há itens físicos, ignoramos totalmente o cálculo de peso/dimensões para Correios
      // e os métodos de frete personalizados.
      const cidadeDestino = enderecoDestino.cidade;
      const estadoDestino = enderecoDestino.estado;

      let opcoesFreteFisico = [];

      if (cidadeDestino && estadoDestino && cidadeDestino.toLowerCase() === 'presidente epitácio' && estadoDestino.toLowerCase() === 'sp') {
        console.log('Endereço de destino é Presidente Epitácio/SP. Oferecendo Frete Grátis.');
        opcoesFreteFisico.push({
          id: 'frete_gratis_local',
          name: 'Frete Grátis (Entrega Local)',
          price: '0.00',
          company: { name: 'Doodle Dreams' },
          delivery_time: 2, // Exemplo: 2 dias úteis para entrega local
          custom_description: 'Entrega grátis em Presidente Epitácio/SP.',
        });
      } else {
        console.log('Endereço de destino não é Presidente Epitácio/SP. Oferecendo Frete Fixo (R$ 9.90).');
        opcoesFreteFisico.push({
          id: 'frete_fixo_nacional',
          name: 'Frete Fixo (Brasil)',
          price: '9.90',
          company: { name: 'Doodle Dreams' },
          delivery_time: 7, // Exemplo: 7 dias úteis para entrega nacional
          custom_description: 'Valor fixo para todo o Brasil.',
        });
      }
      
      console.log('Opções de frete para produtos físicos:', JSON.stringify(opcoesFreteFisico, null, 2));
      console.log('=== FIM CÁLCULO FRETE SERVICE ===');

      // Retorna as opções de frete fixas/grátis. Não há combinação com Correios ou métodos personalizados.
      return opcoesFreteFisico;

    } catch (error) {
      console.error("ERRO GERAL no serviço de frete:", error.message);
      console.error('Detalhes do erro Frete Service:', error.stack);
      throw new Error("Não foi possível calcular o frete no momento.");
    }
  },

  // As funções abaixo para Melhor Envio (comentadas) e CRUD de métodos personalizados (ativadas)
  // permanecem as mesmas, mas não serão invocadas pela função calcularFrete principal.
  // ...
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