const resend = require("../config/resend")

const enviarEmail = async (para, assunto, html) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "noreply@email.jvitor.tech",
      to: para,
      subject: assunto,
      html: html,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error("Erro ao enviar email:", error)
    throw error
  }
}

const templateConfirmacaoPedido = (pedido) => {
  return `
    <h1>Pedido Confirmado!</h1>
    <p>Seu pedido #${pedido.id} foi confirmado com sucesso.</p>
    <p>Total: R$ ${pedido.total}</p>
    <p>Status: ${pedido.status}</p>
  `
}

const templateNovoPost = (post) => {
  return `
    <h1>Novo Post no Blog!</h1>
    <h2>${post.titulo}</h2>
    <p>${post.conteudo.substring(0, 200)}...</p>
    <a href="https://seusite.com/blog/${post.slug}">Leia mais</a>
  `
}

module.exports = {
  enviarEmail,
  templateConfirmacaoPedido,
  templateNovoPost,
}
