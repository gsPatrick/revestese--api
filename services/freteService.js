// src/services/freteService.js

const { MetodoFrete, Produto, VariacaoProduto } = require("../models");
const viaCepService = require("./viaCepService");

// Função auxiliar para limpar e normalizar strings para comparação
function normalizarString(str) {
  // Garantia extra: se a entrada for nula ou indefinida, retorna string vazia.
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const freteService = {
  async calcularFrete(enderecoOrigem, enderecoDestino, itens) {
    try {
      console.log('=== INÍCIO DECISÃO DE FRETE ===');
      console.log('Dados recebidos (enderecoDestino):', JSON.stringify(enderecoDestino, null, 2));

      // REMOVIDA A VALIDAÇÃO PREMATURA QUE CAUSAVA O ERRO.
      // A lógica agora prossegue para tentar popular o endereço via CEP.

      // 1. Tenta obter o nome da cidade e estado a partir do CEP, se não existirem.
      if ((!enderecoDestino.cidade || !enderecoDestino.estado) && enderecoDestino.cep) {
        console.log('Cidade/Estado ausentes. Tentando buscar dados pelo CEP...');
        try {
          const dadosViaCep = await viaCepService.buscarEnderecoPorCep(enderecoDestino.cep);
          enderecoDestino.cidade = dadosViaCep.cidade;
          enderecoDestino.estado = dadosViaCep.estado;
          console.log('Dados do endereço preenchidos via ViaCEP:', JSON.stringify(enderecoDestino, null, 2));
        } catch (cepError) {
          // MODIFICADO: Se a consulta ao ViaCEP falhar, apenas avisa no log e continua.
          // O sistema aplicará o frete fixo como fallback, que é o comportamento desejado.
          console.warn(`AVISO: A consulta ao ViaCEP para o CEP ${enderecoDestino.cep} falhou. Não será possível verificar o frete grátis local. Oferecendo frete padrão. Erro: ${cepError.message}`);
        }
      }

      // 2. Lógica para produtos digitais (sem frete)
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
          company: { name: 'Reveste-se' },
          delivery_time: 0,
          custom_description: 'Seu produto será entregue por e-mail e estará disponível para download na sua conta.',
        }];
      }

      // 3. Lógica para produtos FÍSICOS (decide entre grátis local e fixo nacional)
      const cidadeNormalizada = normalizarString(enderecoDestino.cidade); // Agora seguro, pois normalizarString lida com undefined
      const estadoNormalizado = normalizarString(enderecoDestino.estado); // Também seguro

      console.log(`Verificando: Cidade Normalizada: "${cidadeNormalizada}" | Estado Normalizado: "${estadoNormalizado}"`);
      
      let opcoesFreteFisico = [];
      
      if (cidadeNormalizada === 'presidente epitacio' && (estadoNormalizado === 'sp' || estadoNormalizado === 'sao paulo')) {
        console.log('CONDIÇÃO VERDADEIRA: Endereço de destino é Presidente Epitácio/SP. Oferecendo Frete Grátis.');
        opcoesFreteFisico.push({
          id: 'frete_gratis_local',
          name: 'Frete Grátis (Entrega Local)',
          price: '0.00',
          company: { name: 'Reveste-se' },
          delivery_time: 2,
          custom_description: 'Entrega grátis em Presidente Epitácio/SP.',
        });
      } else {
        console.log('CONDIÇÃO FALSA: Endereço de destino não é Presidente Epitácio/SP (ou falhou a consulta de CEP). Oferecendo Frete Fixo (R$ 9.90).');
        opcoesFreteFisico.push({
          id: 'frete_fixo_nacional',
          name: 'Frete Fixo (Brasil)',
          price: '9.90',
          company: { name: 'Reveste-se' },
          delivery_time: 7,
          custom_description: 'Valor fixo para todo o Brasil.',
        });
      }
      
      console.log('Opções de frete para produtos físicos:', JSON.stringify(opcoesFreteFisico, null, 2));
      console.log('=== FIM DECISÃO DE FRETE ===');

      return opcoesFreteFisico;

    } catch (error) {
      console.error("ERRO CRÍTICO no serviço de frete:", error.message);
      // Este erro só deve ser lançado se houver um problema inesperado, não uma falha de validação controlada.
      throw new Error("Não foi possível calcular o frete. Tente novamente mais tarde.");
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