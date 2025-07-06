const melhorEnvioClient = require("../config/melhorEnvio")
const { MetodoFrete, Produto, VariacaoProduto } = require("../models")

const freteService = {
  async calcularFrete(enderecoOrigem, enderecoDestino, itens) {
    try {
      // Buscar informações completas dos itens para verificar se são digitais
      const flagsDigitais = await Promise.all(
        itens.map(async (item) => {
          if (item.variacaoId) {
            const variacao = await VariacaoProduto.findByPk(item.variacaoId)
            if (!variacao) throw new Error("Variação não encontrada para cálculo de frete")
            return variacao.digital
          }
          const produto = await Produto.findByPk(item.produtoId)
          if (!produto) throw new Error("Produto não encontrado para cálculo de frete")
          return false
        })
      )

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

      const melhorEnvioApiClient = await melhorEnvioClient()
      // Buscar métodos de frete personalizados
      const metodosPersonalizados = await MetodoFrete.findAll({
        where: { ativo: true }
      })

      // Buscar informações completas dos produtos
      const itensCompletos = await Promise.all(
        itens.map(async (item) => {
          const produto = await Produto.findByPk(item.produtoId)
          if (!produto) {
            throw new Error(`Produto com ID ${item.produtoId} não encontrado`)
          }

          let precoSeguro;
          if (item.variacaoId) {
            const variacao = await VariacaoProduto.findByPk(item.variacaoId)
            if (variacao) {
              precoSeguro = variacao.preco;
            } else {
              throw new Error("Produto sem variação não é permitido para cálculo de frete");
            }
          }

          return {
            produtoId: item.produtoId,
            largura: produto.largura || 10,
            altura: produto.altura || 10,
            comprimento: produto.comprimento || 10,
            peso: produto.peso || 0.3,
            preco: precoSeguro,
            quantidade: item.quantidade
          }
        })
      )

      // Calcular opções do Melhor Envio
      const payload = {
        from: {
          postal_code: enderecoOrigem.cep,
        },
        to: {
          postal_code: enderecoDestino.cep,
        },
        products: itensCompletos.map((item) => ({
          id: item.produtoId,
          width: item.largura,
          height: item.altura,
          length: item.comprimento,
          weight: item.peso,
          insurance_value: item.preco,
          quantity: item.quantidade,
        })),
      }

      const response = await melhorEnvioApiClient.post("/shipment/calculate", payload)
      const opcoesMelhorEnvio = response.data

      // Formatar métodos personalizados no mesmo formato das opções do Melhor Envio
      const opcoesPersonalizadas = metodosPersonalizados.map(metodo => ({
        id: `custom_${metodo.id}`,
        name: metodo.titulo,
        price: parseFloat(metodo.valor),
        custom: true,
        company: { name: "Frete Personalizado" },
        delivery_time: metodo.prazoEntrega,
        custom_description: metodo.descricao,
      }))

      // Combinar ambas as opções
      return [...opcoesMelhorEnvio, ...opcoesPersonalizadas]
    } catch (error) {
      console.error("Erro ao calcular frete:", error.response?.data || error.message)
      throw new Error("Erro ao calcular frete")
    }
  },

  async gerarEtiqueta(pedidoId, enderecoOrigem, enderecoDestino, itens) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient()

      // Helper para remover chaves vazias/undefined
      const sanitize = (obj) => {
        Object.keys(obj).forEach((k) => {
          if (obj[k] === undefined || obj[k] === null) delete obj[k]
        })
        return obj
      }

      const payload = {
        service: 1, // Correios PAC
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
        volumes: [
          {
            height: 10,
            width: 10,
            length: 10,
            weight: 0.3,
          },
        ],
        options: {
          insurance_value: itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0),
          receipt: false,
          own_hand: false,
        },
      }

      // Log para depuração (pode ser removido em produção)
      // console.log("Payload etiqueta:", JSON.stringify(payload, null, 2))

      const response = await melhorEnvioApiClient.post("/cart", payload)
      return response.data
    } catch (error) {
      console.error("Erro ao gerar etiqueta:", error.response?.data || error.message)
      throw new Error("Erro ao gerar etiqueta")
    }
  },

  async comprarEtiqueta(idsEtiquetas) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient()
      const payload = {
        orders: idsEtiquetas, // A API espera um array de IDs
      }
      const response = await melhorEnvioApiClient.post("/shipment/checkout", payload)
      return response.data
    } catch (error) {
      console.error("Erro ao comprar etiqueta:", error.response?.data || error.message)
      throw new Error("Erro ao comprar etiqueta")
    }
  },

  async imprimirEtiqueta(idsEtiquetas) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient()
      const payload = {
        mode: "private", // "public" para URL pública, "private" para download direto
        orders: idsEtiquetas,
      }
      const response = await melhorEnvioApiClient.post("/shipment/print", payload, {
        responseType: 'arraybuffer', // Importante para receber o arquivo
      })

      // A API retorna o PDF diretamente. Você pode salvá-lo ou enviá-lo.
      return {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="etiqueta-${idsEtiquetas[0]}.pdf"`,
        },
        data: response.data,
      }
    } catch (error) {
      console.error("Erro ao imprimir etiqueta:", error.response?.data || error.message)
      throw new Error("Erro ao imprimir etiqueta")
    }
  },

  async rastrearEntrega(codigoRastreio) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient()
      const response = await melhorEnvioApiClient.get(`/shipment/tracking?code=${codigoRastreio}`)
      return response.data
    } catch (error) {
      console.error("Erro ao rastrear entrega:", error.response?.data || error.message)
      throw new Error("Erro ao rastrear entrega")
    }
  },

  async cancelarEtiqueta(codigoRastreio) {
    try {
      const melhorEnvioApiClient = await melhorEnvioClient()
      const response = await melhorEnvioApiClient.post(`/shipment/cancel`, {
        order_id: codigoRastreio,
      })
      return response.data
    } catch (error) {
      console.error("Erro ao cancelar etiqueta:", error.response?.data || error.message)
      throw new Error("Erro ao cancelar etiqueta")
    }
  },

  async criarMetodoFrete(dados) {
    try {
      const novoMetodo = await MetodoFrete.create(dados)
      return novoMetodo
    } catch (error) {
      console.error("Erro ao criar método de frete:", error.message)
      throw new Error("Erro ao criar método de frete")
    }
  },

  async listarMetodosFrete() {
    try {
      const metodos = await MetodoFrete.findAll()
      return metodos
    } catch (error) {
      console.error("Erro ao listar métodos de frete:", error.message)
      throw new Error("Erro ao listar métodos de frete")
    }
  },

  async obterMetodoFrete(id) {
    try {
      const metodo = await MetodoFrete.findByPk(id)
      if (!metodo) {
        throw new Error("Método de frete não encontrado")
      }
      return metodo
    } catch (error) {
      console.error("Erro ao obter método de frete:", error.message)
      throw new Error(error.message)
    }
  },

  async atualizarMetodoFrete(id, dados) {
    try {
      const metodo = await MetodoFrete.findByPk(id)
      if (!metodo) {
        throw new Error("Método de frete não encontrado")
      }

      await metodo.update(dados)
      return metodo
    } catch (error) {
      console.error("Erro ao atualizar método de frete:", error.message)
      throw new Error(error.message)
    }
  },

  async removerMetodoFrete(id) {
    try {
      const metodo = await MetodoFrete.findByPk(id)
      if (!metodo) {
        throw new Error("Método de frete não encontrado")
      }

      await metodo.destroy()
      return { mensagem: "Método de frete removido com sucesso" }
    } catch (error) {
      console.error("Erro ao remover método de frete:", error.message)
      throw new Error(error.message)
    }
  }
}

module.exports = freteService
