const mercadopago = require("../config/mercadoPago")

const criarPreferencia = async (itens, usuario) => {
  try {
    const preference = {
      items: itens.map((item) => ({
        title: item.nome,
        unit_price: Number.parseFloat(item.preco),
        quantity: item.quantidade,
      })),
      payer: {
        name: usuario.nome,
        email: usuario.email,
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/pagamento/sucesso`,
        failure: `${process.env.FRONTEND_URL}/pagamento/erro`,
        pending: `${process.env.FRONTEND_URL}/pagamento/pendente`,
      },
      auto_return: "approved",
    }

    const response = await mercadopago.preferences.create(preference)
    return response.body
  } catch (error) {
    console.error("Erro ao criar preferência:", error)
    throw error
  }
}

const verificarPagamento = async (paymentId) => {
  try {
    const payment = await mercadopago.payment.findById(paymentId)
    return payment.body
  } catch (error) {
    console.error("Erro ao verificar pagamento:", error)
    throw error
  }
}

module.exports = {
  criarPreferencia,
  verificarPagamento,
}
