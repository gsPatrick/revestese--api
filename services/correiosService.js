const axios = require('axios');

const correiosService = {
async calcularFreteCorreios(args) {
    try {
      console.log('--- INÍCIO CÁLCULO CORREIOS (via Frenet REST v1) ---');
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
          ShippingServiceCode: null,
          RecipientCountry: 'BR',
          ShippingItemArray: [
            {
              Height: Number(nVlAltura),
              Length: Number(nVlComprimento),
              Width: Number(nVlLargura),
              Weight: Number(nVlPeso),
              Quantity: 1,
              SKU: "frete_auto",
              Category: "Geral"
            }
          ]
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            // TOKEN REMOVIDO para permitir chamadas deslogadas
            // 'token': '085C9935RA315R45F8RB755RB94B3584E3DE' 
          }
        }
      );

      console.log('Resposta BRUTA da Frenet:', JSON.stringify(response.data, null, 2));

      const opcoesFormatadas = (response.data.ShippingSevicesArray || [])
        .filter(s => !s.Error && Number(s.ShippingPrice) > 0)
        .map(servico => ({
          id: servico.ServiceCode,
          name: servico.ServiceDescription,
          price: Number(servico.ShippingPrice).toFixed(2),
          company: { name: servico.Carrier || 'Correios' },
          delivery_time: servico.DeliveryTime,
          custom_description: `Entrega em até ${servico.DeliveryTime} dias úteis.`,
        }));

      console.log('Opções FORMATADAS:', JSON.stringify(opcoesFormatadas, null, 2));
      console.log('--- FIM CÁLCULO CORREIOS (via Frenet REST v1) ---');

      return opcoesFormatadas;

    } catch (error) {
      console.error('ERRO na requisição Frenet:', error.message);
      console.error(error.stack);
      // Se houver um erro específico de configuração ou timeout, retorne um array vazio ou um erro mais claro.
      // Por enquanto, manter o retorno vazio para não quebrar o fluxo.
      return []; 
    }
  }
};

module.exports = correiosService;
