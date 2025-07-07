// Importa o nosso novo serviço simples dos Correios
const correiosService = require("./correiosService");
const { MetodoFrete, Produto, VariacaoProduto } = require("../models");

const freteService = {
  /**
   * Calcula o frete usando o serviço direto dos Correios e métodos personalizados.
   */
  async calcularFrete(enderecoOrigem, enderecoDestino, itens) {
    try {
      // 1. A lógica para produtos digitais continua a mesma
      const flagsDigitais = await Promise.all(
        itens.map(async (item) => {
          if (item.variacaoId) {
            const variacao = await VariacaoProduto.findByPk(item.variacaoId);
            if (!variacao) throw new Error(`Variação ${item.variacaoId} não encontrada`);
            return variacao.digital;
          }
          return false;
        })
      );

      const todosDigitais = flagsDigitais.every(Boolean);

      if (todosDigitais) {
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
      let comprimentoMax = 0;
      let larguraMax = 0;
      let alturaTotal = 0;

      const itensFisicos = itens.filter((_, index) => !flagsDigitais[index]);

      for (const item of itensFisicos) {
        const produto = await Produto.findByPk(item.produtoId);
        const variacao = await VariacaoProduto.findByPk(item.variacaoId);

        if (!produto || !variacao) continue;

        // Soma os pesos e valores
        pesoTotal += (produto.peso || 0.3) * item.quantidade;
        valorTotalDeclarado += (Number(variacao.preco) || 0) * item.quantidade;

        // Simula o empacotamento: empilha os itens e pega a maior largura/comprimento
        alturaTotal += (produto.altura || 10) * item.quantidade;
        larguraMax = Math.max(larguraMax, produto.largura || 10);
        comprimentoMax = Math.max(comprimentoMax, produto.comprimento || 10);
      }
      
      // Validações mínimas dos Correios
      const pacote = {
          sCepOrigem: enderecoOrigem.cep.replace(/\D/g, ''),
          sCepDestino: enderecoDestino.cep.replace(/\D/g, ''),
          nVlPeso: Math.max(0.3, pesoTotal), // Mínimo de 0.3kg
          nVlComprimento: Math.max(16, comprimentoMax), // Mínimo de 16cm
          nVlAltura: Math.max(2, alturaTotal), // Mínimo de 2cm
          nVlLargura: Math.max(11, larguraMax), // Mínimo de 11cm
          nVlValorDeclarado: Math.max(21, valorTotalDeclarado) // Mínimo de R$21 para seguro
      };

      // 3. Chamar o nosso novo serviço dos Correios
      const opcoesCorreios = await correiosService.calcularFreteCorreios(pacote);

      // 4. Buscar e formatar os seus métodos personalizados (como frete grátis)
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

      // 5. Combinar tudo e retornar
      return [...opcoesCorreios, ...opcoesPersonalizadas];

    } catch (error) {
      console.error("Erro geral no serviço de frete:", error.message);
      throw new Error("Não foi possível calcular o frete no momento.");
    }
  },

  // As funções abaixo eram para o Melhor Envio.
  // Elas não funcionarão com a nova abordagem, mas as manterei comentadas
  // caso você queira reimplementar a geração de etiquetas futuramente.
  /*
  async gerarEtiqueta(...) { ... },
  async comprarEtiqueta(...) { ... },
  async imprimirEtiqueta(...) { ... },
  async rastrearEntrega(...) { ... },
  async cancelarEtiqueta(...) { ... },
  */

  // O CRUD de métodos personalizados continua funcionando normalmente.
  async criarMetodoFrete(dados) {
    try {
      return await MetodoFrete.create(dados);
    } catch (error) {
      throw new Error("Erro ao criar método de frete");
    }
  },
  async listarMetodosFrete() {
    return await MetodoFrete.findAll();
  },
  async obterMetodoFrete(id) {
    const metodo = await MetodoFrete.findByPk(id);
    if (!metodo) throw new Error("Método de frete não encontrado");
    return metodo;
  },
  async atualizarMetodoFrete(id, dados) {
    const metodo = await this.obterMetodoFrete(id);
    return await metodo.update(dados);
  },
  async removerMetodoFrete(id) {
    const metodo = await this.obterMetodoFrete(id);
    await metodo.destroy();
    return { mensagem: "Método de frete removido com sucesso" };
  }
};

module.exports = freteService;