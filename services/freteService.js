// src/services/freteService.js

const axios = require('axios');
const { MetodoFrete, Produto, VariacaoProduto, ConfiguracaoLoja } = require("../models");
const viaCepService = require("./viaCepService");

const FRENET_API_URL = 'https://api.frenet.com.br/shipping/quote';
const FRENET_TOKEN   = process.env.FRENET_TOKEN;
const ORIGEM_CEP     = process.env.ORIGEM_CEP || '19280000';

function normalizarString(str) {
  if (!str) return '';
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function limparCep(cep) {
  return (cep || '').replace(/\D/g, '');
}

// Busca produto com dimensões no banco
async function obterDimensoesProduto(produtoId) {
  const produto = await Produto.findByPk(produtoId, {
    attributes: ['peso', 'largura', 'altura', 'comprimento'],
  });
  return {
    Weight:   parseFloat(produto?.peso)        || 0.3,
    Length:   parseFloat(produto?.comprimento) || 30,
    Height:   parseFloat(produto?.altura)      || 5,
    Width:    parseFloat(produto?.largura)     || 20,
  };
}

const freteService = {
  async calcularFrete(enderecoOrigem, enderecoDestino, itens) {
    try {
      // 0. Verificar se frete grátis está ativado globalmente
      const cfgFreteGratis = await ConfiguracaoLoja.findOne({ where: { chave: 'FRETE_GRATIS' } });
      if (cfgFreteGratis && cfgFreteGratis.valor === 'true') {
        return [{
          id: 'frete_gratis',
          name: 'Frete Grátis',
          price: '0.00',
          company: { name: 'Reveste-se' },
          delivery_time: 7,
          custom_description: 'Promoção especial: frete grátis para todo o Brasil!',
        }];
      }

      // 1. Produtos 100% digitais — sem frete
      const flagsDigitais = await Promise.all(
        itens.map(async (item) => {
          if (item.variacaoId) {
            const v = await VariacaoProduto.findByPk(item.variacaoId);
            return v?.digital || false;
          }
          return false;
        })
      );
      if (flagsDigitais.every(Boolean)) {
        return [{
          id: 'digital_delivery',
          name: 'Entrega Digital',
          price: '0.00',
          company: { name: 'Reveste-se' },
          delivery_time: 0,
          custom_description: 'Seu produto será enviado por e-mail após a confirmação do pagamento.',
        }];
      }

      // 2. Preenche cidade/estado do destino via ViaCEP se ausentes
      if ((!enderecoDestino.cidade || !enderecoDestino.estado) && enderecoDestino.cep) {
        try {
          const dados = await viaCepService.buscarEnderecoPorCep(enderecoDestino.cep);
          enderecoDestino.cidade = dados.cidade;
          enderecoDestino.estado = dados.estado;
        } catch (_) {}
      }

      // 3. Entrega local grátis — Presidente Epitácio/SP
      const cidadeNorm = normalizarString(enderecoDestino.cidade);
      const estadoNorm = normalizarString(enderecoDestino.estado);
      if (cidadeNorm === 'presidente epitacio' && (estadoNorm === 'sp' || estadoNorm === 'sao paulo')) {
        return [{
          id: 'frete_gratis_local',
          name: 'Entrega Local Grátis',
          price: '0.00',
          company: { name: 'Reveste-se' },
          delivery_time: 1,
          custom_description: 'Entrega gratuita em Presidente Epitácio/SP.',
        }];
      }

      // 4. Cotação via Frenet
      const cepDestino = limparCep(enderecoDestino.cep);
      const cepOrigem  = limparCep(ORIGEM_CEP);

      if (!cepDestino || cepDestino.length !== 8) {
        throw new Error('CEP de destino inválido.');
      }

      // Monta array de itens com dimensões reais do produto
      const shippingItems = await Promise.all(
        itens.map(async (item) => {
          const dims = await obterDimensoesProduto(item.produtoId);
          return { ...dims, Quantity: item.quantidade || 1 };
        })
      );

      // Calcula valor total estimado (usado como ShipmentInvoiceValue)
      const valorTotal = itens.reduce((sum, item) => {
        const preco = parseFloat(item.preco) || 50;
        return sum + preco * (item.quantidade || 1);
      }, 0);

      const payload = {
        SellerCEP:             cepOrigem,
        RecipientCEP:          cepDestino,
        ShipmentInvoiceValue:  valorTotal || 50,
        ShippingItemArray:     shippingItems,
      };

      console.log('[Frenet] Payload:', JSON.stringify(payload));

      const { data } = await axios.post(FRENET_API_URL, payload, {
        headers: {
          'token':        FRENET_TOKEN,
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
        timeout: 15000,
      });

      console.log('[Frenet] Resposta:', JSON.stringify(data?.ShippingSevicesArray?.length), 'serviços');

      const servicos = (data?.ShippingSevicesArray || []).filter(s => !s.Error);

      if (servicos.length === 0) {
        // Fallback se Frenet não retornar opções
        return [{
          id: 'frete_fallback',
          name: 'Entrega Padrão',
          price: '19.90',
          company: { name: 'Correios' },
          delivery_time: 10,
          custom_description: 'Prazo estimado de entrega.',
        }];
      }

      // Normaliza resposta da Frenet para o formato do sistema
      return servicos.map(s => ({
        id:            s.ServiceCode || s.CarrierCode,
        name:          `${s.Carrier} - ${s.ServiceDescription}`,
        price:         parseFloat(s.ShippingPrice).toFixed(2),
        company:       { name: s.Carrier },
        delivery_time: parseInt(s.DeliveryTime) || 7,
        carrier_code:  s.CarrierCode,
        service_code:  s.ServiceCode,
      }));

    } catch (error) {
      console.error('[Frenet] Erro ao calcular frete:', error.message);
      // Fallback seguro em caso de falha na API
      return [{
        id: 'frete_fallback',
        name: 'Entrega Padrão',
        price: '19.90',
        company: { name: 'Correios' },
        delivery_time: 10,
        custom_description: 'Cotação temporariamente indisponível. Valor estimado.',
      }];
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