const { verificarToken } = require("../utils/jwt")
const { Usuario } = require("../models")

const autenticar = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ erro: "Token de acesso requerido" })
    }

    const decoded = verificarToken(token)
    const usuario = await Usuario.findByPk(decoded.id)

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: "Usuário não encontrado ou inativo" })
    }

    req.usuario = usuario
    next()
  } catch (error) {
    res.status(401).json({ erro: "Token inválido" })
  }
}

module.exports = autenticar
