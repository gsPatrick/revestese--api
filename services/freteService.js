const melhorEnvioClient = require("../config/melhorEnvioClient");
const { MetodoFrete, Produto, VariacaoProduto } = require("../models");

const freteService = {
  /**
   * Calcula o frete para um conjunto de itens e um CEP de destino.
   * Utiliza um cliente inteligente que gerencia o token de autenticação.
   */
  async calcularFrete(enderecoOrigem, enderecoDestino, itens) {
    try {
      // 1. VERIFICA SE TODOS OS PRODUTOS SÃO DIGITAIS
      const flagsDigitais = await Promise.all(
        itens.map(async (item) => {
          if (item.variacaoId) {
            const variacao = await VariacaoProduto.findByPk(item.variacaoId);
            if (!variacao) throw new Error(`Variação ${item.variacaoId} não encontrada para cálculo de frete`);
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

      // 2. OBTÉM UMA INSTÂNCIA AUTENTICADA DO CLIENTE
      const melhorEnvioApiClient = await melhorEnvioClient();
      
      const metodosPersonalizados = await MetodoFrete.findAll({ where: { ativo: true } });

      const itensFisicosCompletos = await Promise.all(
        itens
        .filter((_, index) => !flagsDigitais[index])
        .map(async (item) => {
            const produto = await Produto.findByPk(item.produtoId);
            if (!produto) throw new Error(`Produto com ID ${item.produtoId} não encontrado`);

            const variacao = await VariacaoProduto.findByPk(item.variacaoId);
            if (!variacao) throw new Error(`Variação com ID ${item.variacaoId} não encontrada`);

            return {
              id: item.produtoId.toString(),
              width: produto.largura || 10,
              height: produto.altura || 10,
              length: produto.comprimento || 10,
              weight: produto.peso || 0.3,
              insurance_value: Number(variacao.preco),
              quantity: item.quantidade,
            };
          })
      );

      if (itensFisicosCompletos.length === 0) {
        return [];
      }

      const payload = {
        from: { postal_code: enderecoOrigem.cep.replace(/\D/g, '') },
        to: { postal_code: enderecoDestino.cep.replace(/\D/g, '') },
        products: itensFisicosCompletos,
        options: { receipt: false, own_hand: false }
      };

      const response = await melhorEnvioApiClient.post("/shipment/calculate", payload);
      const opcoesMelhorEnvio = response.data.filter(option => !option.error);

      const opcoesPersonalizadas = metodosPersonalizados.map(metodo => ({
        id: `custom_${metodo.id}`,
        name: metodo.titulo,
        price: parseFloat(metodo.valor).toFixed(2),
        custom: true,
        company: { name: "Frete Personalizado" },
        delivery_time: metodo.prazoEntrega,
        custom_description: metodo.descricao,
      }));

      return [...opcoesMelhorEnvio, ...opcoesPersonalizadas];

    } catch (error) {
      console.error("Erro detalhado ao calcular frete:", error.response?.data || error.message);
      throw new Error("Não foi possível calcular o frete. Verifique o CEP e tente novamente.");
    }
  },

  /**
   * Gera uma etiqueta de envio no Melhor Envio.
   */
  async gerarEtiqueta(pedidoId, enderecoOrigem, enderecoDestino, itens) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient();

      const sanitize = (obj) => {
        Object.keys(obj).forEach((k) => (obj[k] === undefined || obj[k] === null) && delete obj[k]);
        return obj;
      };

      const payload = {
        service: 1, // Exemplo: Correios PAC. Isso deveria ser dinâmico, baseado na escolha do cliente.
        from: sanitize({
          name: enderecoOrigem.nome,
          phone: enderecoOrigem.telefone,
          email: enderecoOrigem.email,
          document: enderecoOrigem.documento,
          company_document: enderecoOrigem.company_document,
          state_register: enderecoOrigem.state_register,
          postal_code: enderecoOrigem.cep,
          address: enderecoOrigem.rua,
          number: enderecoOrigem.numero,
          district: enderecoOrigem.bairro,
          city: enderecoOrigem.cidade,
          state_abbr: enderecoOrigem.estado,
          country_id: "BR",
        }),
        to: sanitize({
          name: enderecoDestino.nome || "Destinatário",
          phone: enderecoDestino.telefone || "",
          email: enderecoDestino.email || "",
          document: enderecoDestino.documento || "",
          postal_code: enderecoDestino.cep,
          address: enderecoDestino.rua,
          number: enderecoDestino.numero,
          district: enderecoDestino.bairro,
          city: enderecoDestino.cidade,
          state_abbr: enderecoDestino.estado,
          country_id: "BR",
        }),
        products: itens.map((item) => ({
          name: item.nome,
          quantity: item.quantidade,
          unitary_value: item.preco,
        })),
        volumes: [{ height: 10, width: 10, length: 10, weight: 0.3 }], // Simplificado, idealmente seria calculado
        options: {
          insurance_value: itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0),
          receipt: false,
          own_hand: false,
        },
      };

      const response = await melhorEnvioApiClient.post("/cart", payload);
      return response.data;

    } catch (error) {
      console.error("Erro ao gerar etiqueta:", error.response?.data || error.message);
      throw new Error("Erro ao gerar etiqueta");
    }
  },

  /**
   * Efetiva a compra de etiquetas previamente geradas.
   */
  async comprarEtiqueta(idsEtiquetas) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient();
      const payload = { orders: idsEtiquetas };
      const response = await melhorEnvioApiClient.post("/shipment/checkout", payload);
      return response.data;
    } catch (error) {
      console.error("Erro ao comprar etiqueta:", error.response?.data || error.message);
      throw new Error("Erro ao comprar etiqueta");
    }
  },

  /**
   * Gera o PDF para impressão das etiquetas compradas.
   */
  async imprimirEtiqueta(idsEtiquetas) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient();
      const payload = { mode: "private", orders: idsEtiquetas };
      const response = await melhorEnvioApiClient.post("/shipment/print", payload, {
        responseType: 'arraybuffer',
      });
      return {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="etiqueta-${idsEtiquetas[0]}.pdf"`,
        },
        data: response.data,
      };
    } catch (error) {
      console.error("Erro ao imprimir etiqueta:", error.response?.data || error.message);
      throw new Error("Erro ao imprimir etiqueta");
    }
  },

  /**
   * Rastreia o status de uma entrega a partir do código.
   */
  async rastrearEntrega(codigoRastreio) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient();
      const response = await melhorEnvioApiClient.get(`/shipment/tracking?code=${codigoRastreio}`);
      return response.data;
    } catch (error)
    {
      console.error("Erro ao rastrear entrega:", error.response?.data || error.message);
      throw new Error("Erro ao rastrear entrega");
    }
  },

  /**
   * Solicita o cancelamento de uma etiqueta.
   */
  async cancelarEtiqueta(codigoRastreio) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient();
      const response = await melhorEnvioApiClient.post(`/shipment/cancel`, { order_id: codigoRastreio });
      return response.data;
    } catch (error) {
      console.error("Erro ao cancelar etiqueta:", error.response?.data || error.message);
      throw new Error("Erro ao cancelar etiqueta");
    }
  },

  // --- CRUD PARA MÉTODOS DE FRETE PERSONALIZADOS ---

  /**
   * Cria um novo método de frete personalizado no banco de dados.
   */
  async criarMetodoFrete(dados) {
    try {
      const novoMetodo = await MetodoFrete.create(dados);
      return novoMetodo;
    } catch (error) {
      console.error("Erro ao criar método de frete:", error.message);
      throw new Error("Erro ao criar método de frete");
    }
  },

  /**
   * Lista todos os métodos de frete personalizados.
   */
  async listarMetodosFrete() {
    try {
      const metodos = await MetodoFrete.findAll();
      return metodos;
    } catch (error) {
      console.error("Erro ao listar métodos de frete:", error.message);
      throw new Error("Erro ao listar métodos de frete");
    }
  },

  /**
   * Obtém um método de frete personalizado por ID.
   */
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

  /**
   * Atualiza um método de frete personalizado.
   */
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

  /**
   * Remove um método de frete personalizado.
   */
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