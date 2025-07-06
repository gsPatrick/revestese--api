const restringirAdmin = (req, res, next) => {
  if (req.usuario.tipo !== "admin") {
    return res.status(403).json({ erro: "Acesso negado. Apenas administradores." })
  }
  next()
}

module.exports = restringirAdmin
