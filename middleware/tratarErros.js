const tratarErros = (err, req, res, next) => {
  console.error(err.stack)

  if (err.name === "ValidationError") {
    return res.status(400).json({
      erro: "Dados inválidos",
      detalhes: err.details?.map((detail) => detail.message) || err.message,
    })
  }

  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      erro: "Erro de validação",
      detalhes: err.errors.map((error) => error.message),
    })
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      erro: "Dados duplicados",
      detalhes: "Este registro já existe",
    })
  }

  if (err.name === "Credenciais inválidas") {
    return res.status(401).json({
      erro: "Credenciais inválidas",
      detalhes: "Email ou senha inválidos",
    })
  }
  res.status(500).json({
    erro: "Erro interno do servidor",
    message: process.env.NODE_ENV === "development" ? err.message : "Algo deu errado",
  })
}

module.exports = tratarErros
