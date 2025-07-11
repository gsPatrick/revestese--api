const { verificarToken } = require("../utils/jwt");
const { Usuario } = require("../models");

/**
 * Middleware de autenticação opcional.
 * Tenta verificar o token, se existir e for válido, anexa o usuário ao request.
 * Se não houver token ou se ele for inválido, apenas continua a execução sem erro.
 */
const autenticarOpcional = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Se não há token, simplesmente continua para a próxima rota.
    // req.user não será definido.
    return next();
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = verificarToken(token);
    const usuario = await Usuario.findByPk(decoded.id);

    if (usuario && usuario.ativo) {
      // Se o token é válido e o usuário existe, anexa ao request.
      // Usamos req.user para padronizar com seu middleware verifyToken.
      req.user = usuario;
      req.usuario = usuario; // Mantém compatibilidade
    }
  } catch (error) {
    // Se o token for inválido (expirado, etc.), não fazemos nada, apenas continuamos.
    // A ideia é não bloquear a requisição por um token opcional ruim.
    console.warn("Token opcional inválido foi ignorado:", error.message);
  }

  next();
};

module.exports = autenticarOpcional;