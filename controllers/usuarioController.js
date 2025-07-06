const { Usuario } = require("../models")
const bcrypt = require("bcryptjs")
const { enviarEmail } = require("../utils/email")

const usuarioController = {
    // Cliente atualiza o próprio perfil
    async atualizarPerfil(req, res, next) {
        try {
            const { id } = req.user
            const { nome, email, senhaAtual, novaSenha } = req.body

            const usuario = await Usuario.findByPk(id)
            if (!usuario) {
                return res.status(404).json({ erro: "Usuário não encontrado" })
            }

            // Atualizar dados básicos
            if (nome) usuario.nome = nome

            // Se quiser atualizar e-mail, verificar se não está em uso
            if (email && email !== usuario.email) {
                const emailExistente = await Usuario.findOne({ where: { email } })
                if (emailExistente) {
                    return res.status(400).json({ erro: "Email já está em uso" })
                }
                usuario.email = email
            }

            // Se quiser atualizar senha
            if (novaSenha) {
                if (!senhaAtual) {
                    return res.status(400).json({ erro: "Senha atual é obrigatória para alterar a senha" })
                }

                const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash)
                if (!senhaValida) {
                    return res.status(400).json({ erro: "Senha atual incorreta" })
                }

                usuario.senhaHash = await bcrypt.hash(novaSenha, 10)
            }

            await usuario.save()

            res.json({
                mensagem: "Perfil atualizado com sucesso",
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    tipo: usuario.tipo
                }
            })
        } catch (error) {
            next(error)
        }
    },

    // Cliente obtém seus próprios dados
    async obterPerfil(req, res, next) {
        try {
            const { id } = req.user

            const usuario = await Usuario.findByPk(id)
            if (!usuario) {
                return res.status(404).json({ erro: "Usuário não encontrado" })
            }

            res.json({
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo,
                telefone: usuario.telefone,
                dataCriacao: usuario.createdAt
            })
        } catch (error) {
            next(error)
        }
    },

    // Admin lista todos os usuários
    async listarUsuarios(req, res, next) {
        try {
            const { pagina = 1, limite = 10, busca = "", tipo } = req.query

            const offset = (pagina - 1) * limite
            const where = {}

            if (busca) {
                where.$or = [
                    { nome: { $like: `%${busca}%` } },
                    { email: { $like: `%${busca}%` } }
                ]
            }

            if (tipo) {
                where.tipo = tipo
            }

            const { count, rows } = await Usuario.findAndCountAll({
                where,
                attributes: ['id', 'nome', 'email', 'tipo', 'ativo', 'createdAt'],
                offset,
                limit: parseInt(limite),
                order: [['createdAt', 'DESC']]
            })

            res.json({
                usuarios: rows,
                total: count,
                paginas: Math.ceil(count / limite),
                paginaAtual: parseInt(pagina)
            })
        } catch (error) {
            next(error)
        }
    },

    // Admin obtém detalhes de um usuário
    async obterUsuario(req, res, next) {
        try {
            const { id } = req.params

            const usuario = await Usuario.findByPk(id)
            if (!usuario) {
                return res.status(404).json({ erro: "Usuário não encontrado" })
            }

            res.json({
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo,
                ativo: usuario.ativo,
                telefone: usuario.telefone,
                dataCriacao: usuario.createdAt,
                dataAtualizacao: usuario.updatedAt
            })
        } catch (error) {
            next(error)
        }
    },

    // Admin atualiza um usuário
    async atualizarUsuario(req, res, next) {
        try {
            const { id } = req.params
            const { nome, email, tipo, ativo, novaSenha } = req.body

            const usuario = await Usuario.findByPk(id)
            if (!usuario) {
                return res.status(404).json({ erro: "Usuário não encontrado" })
            }

            // Atualizar dados básicos
            if (nome !== undefined) usuario.nome = nome
            if (email !== undefined && email !== usuario.email) {
                const emailExistente = await Usuario.findOne({ where: { email } })
                if (emailExistente) {
                    return res.status(400).json({ erro: "Email já está em uso" })
                }
                usuario.email = email
            }
            if (tipo !== undefined) usuario.tipo = tipo
            if (ativo !== undefined) usuario.ativo = ativo

            // Se quiser atualizar senha
            if (novaSenha) {
                usuario.senhaHash = await bcrypt.hash(novaSenha, 10)

                // Notificar usuário sobre alteração de senha
                await enviarEmail(
                    usuario.email,
                    "Sua senha foi alterada",
                    `
          <h1>Sua senha foi alterada</h1>
          <p>Olá ${usuario.nome},</p>
          <p>Sua senha foi alterada por um administrador.</p>
          <p>Se você não solicitou esta alteração, entre em contato conosco imediatamente.</p>
          `
                )
            }

            await usuario.save()

            res.json({
                mensagem: "Usuário atualizado com sucesso",
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    tipo: usuario.tipo,
                    ativo: usuario.ativo
                }
            })
        } catch (error) {
            next(error)
        }
    },

    // Admin exclui um usuário (soft delete)
    async excluirUsuario(req, res, next) {
        try {
            const { id } = req.params

            const usuario = await Usuario.findByPk(id)
            if (!usuario) {
                return res.status(404).json({ erro: "Usuário não encontrado" })
            }

            await usuario.destroy()
            res.json({ mensagem: "Usuário removido com sucesso" })
        } catch (error) {
            next(error)
        }
    },

    // Admin cria novo usuário
    async criarUsuario(req, res, next) {
        try {
            const { nome, email, tipo, ativo, novaSenha } = req.body
            if (!nome || !email || !novaSenha) {
                return res.status(400).json({ erro: "Nome, email e senha são obrigatórios" })
            }
            // Verificar email único
            const existente = await Usuario.findOne({ where: { email } })
            if (existente) {
                return res.status(400).json({ erro: "Email já está em uso" })
            }
            // Hash da senha
            const senhaHash = await bcrypt.hash(novaSenha, 10)
            const usuario = await Usuario.create({ nome, email, tipo, ativo, senhaHash })
            res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo, ativo: usuario.ativo, createdAt: usuario.createdAt })
        } catch (error) {
            next(error)
        }
    },

    async alterarSenha(req, res, next) {
        try {
            const { id } = req.user
            const { senhaAtual, novaSenha } = req.body

            const usuario = await Usuario.findByPk(id)
            if (!usuario) {
                return res.status(404).json({ erro: "Usuário não encontrado" })
            }

            if (!senhaAtual || !novaSenha) {
                return res.status(400).json({ erro: "A senha atual e a nova senha são obrigatórias." })
            }

            const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash)
            if (!senhaValida) {
                return res.status(400).json({ erro: "Senha atual incorreta." })
            }

            usuario.senhaHash = await bcrypt.hash(novaSenha, 10)
            await usuario.save()

            res.json({ mensagem: "Senha alterada com sucesso." })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = usuarioController 