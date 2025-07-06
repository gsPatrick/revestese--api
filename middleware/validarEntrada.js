const Joi = require("joi")

const validarEntrada = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        erro: "Dados inválidos",
        detalhes: error.details.map((detail) => detail.message),
      })
    }
    next()
  }
}

// Schemas de validação
const schemas = {
  usuario: Joi.object({
    nome: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    senha: Joi.string().min(6).when("googleId", {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    googleId: Joi.string().optional(),
  }),

  // Validação de perfil do cliente
  atualizarPerfil: Joi.object({
    nome: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    novaSenha: Joi.string().min(6).optional(),
    senhaAtual: Joi.string().min(6).when("novaSenha", { is: Joi.exist(), then: Joi.required(), otherwise: Joi.optional() }),
  }),

  alterarSenha: Joi.object({
    novaSenha: Joi.string().min(6).required(),
    senhaAtual: Joi.string().min(6).required(),
  }),

  // Validação de usuário (admin)
  atualizarUsuario: Joi.object({
    nome: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    tipo: Joi.string().valid("cliente", "admin").optional(),
    ativo: Joi.boolean().optional(),
    novaSenha: Joi.string().min(6).optional(),
  }),

  produto: Joi.object({
    nome: Joi.string().min(2).max(200).required(),
    descricao: Joi.string().max(2000).optional(),
    preco: Joi.number().positive().required(),
    categoria: Joi.string().required(),
    estoque: Joi.number().integer().min(0).optional(),
  }),

  endereco: Joi.object({
    cep: Joi.string().length(8).required(),
    rua: Joi.string().required(),
    numero: Joi.string().required(),
    complemento: Joi.string().optional(),
    bairro: Joi.string().required(),
    cidade: Joi.string().required(),
    estado: Joi.string().length(2).required(),
  }),
}

module.exports = { validarEntrada, schemas }
