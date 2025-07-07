// src/services/correiosService.js - atualizado para usar Frenet

const axios = require('axios');

const correiosService = {
  async calcularFreteCorreios(args) {
    try {
      console.log('--- INÍCIO CÁLCULO CORREIOS (via Frenet) ---');
      console.log('Argumentos recebidos:', JSON.stringify(args, null, 2));

      const {
        sCepOrigem,
        sCepDestino,
        nVlPeso,
        nVlComprimento,
        nVlAltura,
        nVlLargura,
        nVlValorDeclarado
      } = args;

      const response = await axios.post(
        'https://api.frenet.com.br/shipping/quote',
        {
          SellerCEP: sCepOrigem,
          RecipientCEP: sCepDestino,
          ShipmentInvoiceValue: Number(nVlValorDeclarado),
          ShippingServiceCode: '', // Deixe vazio para trazer todos (Correios PAC e SEDEX aparecerão)
          Package: [
            {
              Weight: Number(nVlPeso),
              Length: Number(nVlComprimento),
              Height: Number(nVlAltura),
              Width: Number(nVlLargura)
            }
          ]
        },
        {
          headers: {
            Authorization: '085C9935RA315R45F8RB755RB94B3584E3DE',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Resposta BRUTA da Frenet:', JSON.stringify(response.data, null, 2));

      const opcoesFormatadas = (response.data.ShippingSevicesArray || [])
        .filter(s => s.ShippingPrice > 0)
        .map(servico => ({
          id: servico.ServiceCode,
          name: servico.ServiceDescription,
          price: Number(servico.ShippingPrice).toFixed(2),
          company: { name: servico.Carrier || 'Correios' },
          delivery_time: servico.DeliveryTime,
          custom_description: `Entrega em até ${servico.DeliveryTime} dias úteis.`,
        }));

      console.log('Opções FORMATADAS:', JSON.stringify(opcoesFormatadas, null, 2));
      console.log('--- FIM CÁLCULO CORREIOS (via Frenet) ---');

      return opcoesFormatadas;
    } catch (error) {
      console.error('ERRO na requisição Frenet:', error.message);
      console.error(error.stack);
      return [];
    }
  }
};

module.exports = correiosService;
