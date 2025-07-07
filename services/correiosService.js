// src/services/correiosService.js

const Correios = require('node-correios');

const correios = new Correios();

const correiosService = {
  async calcularFreteCorreios(args) {
    try {
      console.log('--- INÍCIO CÁLCULO CORREIOS SERVICE ---');
      console.log('Argumentos recebidos para cálculo Correios:', JSON.stringify(args, null, 2));
      
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

      const payloadCorreios = { // Adicionei esta variável para logar o payload exato
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
      };

      console.log('Payload enviado para a API dos Correios:', JSON.stringify(payloadCorreios, null, 2));

      const resultado = await correios.calcPrecoPrazo(payloadCorreios); // Usando o payload logado
      
      console.log('Resposta BRUTA da API dos Correios:', JSON.stringify(resultado, null, 2));

      // Importante: Verifique se a resposta contém `MsgErro`
      const opcoesFormatadas = resultado
        .filter(servico => servico.Valor && servico.Valor !== '0,00' && servico.MsgErro === '') // Filtra por serviços válidos e sem erro
        .map(servico => ({
          id: servico.Codigo,
          name: servico.Codigo === '04510' ? 'Correios PAC' : 'Correios SEDEX',
          price: servico.Valor.replace(',', '.'),
          company: { name: 'Correios' },
          delivery_time: servico.PrazoEntrega,
          custom_description: `Entrega em até ${servico.PrazoEntrega} dias úteis.`,
          // Adicionado para debug:
          erroCorreios: servico.MsgErro,
          observacaoCorreios: servico.ObsFim,
        }));
      
      console.log('Opções de frete FORMATADAS pelo Correios Service:', JSON.stringify(opcoesFormatadas, null, 2));
      console.log('--- FIM CÁLCULO CORREIOS SERVICE ---');

      return opcoesFormatadas;

    } catch (error) {
      console.error('ERRO no serviço dos Correios:', error.message);
      console.error('Detalhes do erro do Correios Service:', error.stack); // Mostra o stack trace completo
      return [];
    }
  }
};

module.exports = correiosService;