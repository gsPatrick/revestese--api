const { Correios } = require('node-correios');

const correios = new Correios();

const correiosService = {
  /**
   * Calcula o preço e o prazo de entrega para PAC e SEDEX.
   * @param {object} args - Argumentos para o cálculo.
   * @returns {Promise<Array>} - Um array com as opções de frete formatadas.
   */
  async calcularFreteCorreios(args) {
    try {
      console.log('Calculando frete com os Correios para os argumentos:', args);
      
      const {
        sCepOrigem,
        sCepDestino,
        nVlPeso,
        nVlComprimento,
        nVlAltura,
        nVlLargura,
        nVlValorDeclarado
      } = args;
      
      const servicos = ['04510', '04014']; // 04510 = PAC, 04014 = SEDEX

      const resultado = await correios.calcPrecoPrazo({
        nCdServico: servicos,
        sCepOrigem,
        sCepDestino,
        nVlPeso: String(nVlPeso),
        nCdFormato: 1, // 1 = formato caixa/pacote
        nVlComprimento: String(nVlComprimento),
        nVlAltura: String(nVlAltura),
        nVlLargura: String(nVlLargura),
        nVlDiametro: '0',
        sCdMaoPropria: 'N',
        nVlValorDeclarado: String(nVlValorDeclarado),
        sCdAvisoRecebimento: 'N',
      });
      
      console.log('Resultado da API dos Correios:', resultado);

      // Formata a resposta para o padrão que seu frontend espera
      const opcoesFormatadas = resultado
        .filter(servico => servico.Valor && servico.Valor !== '0,00' && !servico.MsgErro)
        .map(servico => ({
          id: servico.Codigo,
          name: servico.Codigo === '04510' ? 'Correios PAC' : 'Correios SEDEX',
          price: servico.Valor.replace(',', '.'), // Converte para formato numérico americano
          company: { name: 'Correios' },
          delivery_time: servico.PrazoEntrega,
          custom_description: `Entrega em até ${servico.PrazoEntrega} dias úteis.`
        }));

      return opcoesFormatadas;

    } catch (error) {
      console.error('Erro no serviço dos Correios:', error.message);
      // Retorna array vazio em caso de erro para não quebrar a aplicação
      return [];
    }
  }
};

module.exports = correiosService;