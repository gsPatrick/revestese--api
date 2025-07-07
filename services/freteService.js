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
              return false; // Se a variação não existe, trate como físico para não perder o cálculo.
            }
            return variacao.digital;
          }
          console.warn(`Item ${item.produtoId} sem variaçãoId. Tratando como físico.`);
          return false; // Se não tiver variação, assume que é físico (ou ajuste conforme sua regra)
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

      // 2. Preparar dados para a API dos Correios
      let pesoTotal = 0;
      let valorTotalDeclarado = 0;
      let comprimentoMax = 0; // Usado para a maior dimensão do pacote
      let larguraMax = 0;     // Usado para a maior dimensão do pacote
      let alturaTotal = 0;    // Soma das alturas para empilhamento

      const itensFisicos = itens.filter((_, index) => !flagsDigitais[index]);
      console.log('Itens Físicos para cálculo de frete:', JSON.stringify(itensFisicos, null, 2));

      if (itensFisicos.length === 0) {
        console.log('Nenhum item físico encontrado para cálculo de frete. Retornando array vazio.');
        return []; // Não há itens físicos para calcular frete tradicional
      }

      for (const item of itensFisicos) {
        const produto = await Produto.findByPk(item.produtoId);
        const variacao = item.variacaoId ? await VariacaoProduto.findByPk(item.variacaoId) : null;

        if (!produto) {
          console.warn(`Produto ${item.produtoId} não encontrado. Ignorando no cálculo de frete.`);
          continue;
        }
        if (item.variacaoId && !variacao) {
          console.warn(`Variação ${item.variacaoId} para produto ${item.produtoId} não encontrada. Ignorando no cálculo de frete.`);
          continue;
        }

        const pesoItem = produto.peso || 0.3; // Garante um valor padrão
        const precoItem = variacao ? (Number(variacao.preco) || 0) : (Number(produto.preco) || 0); // Pega preço da variação ou do produto
        const comprimentoItem = produto.comprimento || 10;
        const larguraItem = produto.largura || 10;
        const alturaItem = produto.altura || 10;

        pesoTotal += pesoItem * item.quantidade;
        valorTotalDeclarado += precoItem * item.quantidade;

        // Considerações para as dimensões:
        // Assume que os itens serão colocados lado a lado no comprimento/largura
        // e empilhados na altura.
        comprimentoMax = Math.max(comprimentoMax, comprimentoItem);
        larguraMax = Math.max(larguraMax, larguraItem);
        alturaTotal += alturaItem * item.quantidade; // Soma as alturas se empilhadas
      }
      
      // Validações mínimas e máximas dos Correios para dimensões e peso
      const pesoFinal = Math.max(0.01, Math.min(30, pesoTotal)); // Correios: 0.01kg a 30kg
      const comprimentoFinal = Math.max(16, Math.min(100, comprimentoMax)); // Correios: 16cm a 100cm
      const alturaFinal = Math.max(2, Math.min(100, alturaTotal)); // Correios: 2cm a 100cm
      const larguraFinal = Math.max(11, Math.min(100, larguraMax)); // Correios: 11cm a 100cm
      const valorDeclaradoFinal = Math.max(0, Math.min(10000, valorTotalDeclarado)); // Correios: até R$10.000

      // A soma das dimensões não deve exceder 200cm
      const somaDimensoes = comprimentoFinal + larguraFinal + alturaFinal;
      if (somaDimensoes > 200) {
          // Se exceder, pode-se tentar ajustar ou lançar um erro específico
          // Para simplificar, vou ajustar proporcionalmente as maiores dimensões para caber
          const ratio = 200 / somaDimensoes;
          comprimentoFinal *= ratio;
          larguraFinal *= ratio;
          alturaFinal *= ratio;
          console.warn(`Dimensões excedem 200cm, ajustando para C: ${comprimentoFinal.toFixed(0)}, L: ${larguraFinal.toFixed(0)}, A: ${alturaFinal.toFixed(0)}`);
      }

      const pacote = {
          sCepOrigem: enderecoOrigem.cep.replace(/\D/g, ''),
          sCepDestino: enderecoDestino.cep.replace(/\D/g, ''),
          nVlPeso: parseFloat(pesoFinal.toFixed(2)),
          nVlComprimento: parseFloat(comprimentoFinal.toFixed(0)), // Arredonda para inteiro
          nVlAltura: parseFloat(alturaFinal.toFixed(0)),
          nVlLargura: parseFloat(larguraFinal.toFixed(0)),
          nVlValorDeclarado: parseFloat(valorDeclaradoFinal.toFixed(2))
      };

      console.log('Dados do Pacote calculados para Correios:', JSON.stringify(pacote, null, 2));

      // 3. Chamar o serviço dos Correios
      const opcoesCorreios = await correiosService.calcularFreteCorreios(pacote);
      console.log('Opções de frete recebidas do Correios Service:', JSON.stringify(opcoesCorreios, null, 2));

      // 4. Buscar métodos personalizados
      const metodosPersonalizados = await MetodoFrete.findAll({ where: { ativo: true } });
      const opcoesPersonalizadas = metodosPersonalizados.map(metodo => ({
        id: `custom_${metodo.id}`,
        name: metodo.titulo,
        price: parseFloat(metodo.valor).toFixed(2),
        custom: true,
        company: { name: "Frete Personalizado" },
        delivery_time: metodo.prazoEntrega,
        custom_description: metodo.descricao,
      }));
      console.log('Opções de frete personalizadas:', JSON.stringify(opcoesPersonalizadas, null, 2));


      // 5. Combinar e retornar
      const todasOpcoes = [...opcoesCorreios, ...opcoesPersonalizadas];
      console.log('Todas as opções de frete COMBINADAS:', JSON.stringify(todasOpcoes, null, 2));
      console.log('=== FIM CÁLCULO FRETE SERVICE ===');

      return todasOpcoes;

    } catch (error) {
      console.error("ERRO GERAL no serviço de frete:", error.message);
      console.error('Detalhes do erro Frete Service:', error.stack);
      throw new Error("Não foi possível calcular o frete no momento.");
    }
  },

  // As funções abaixo para Melhor Envio (comentadas) e CRUD de métodos personalizados (ativadas)
  // permanecem as mesmas.
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