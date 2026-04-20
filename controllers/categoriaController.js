const { Categoria } = require("../models")

const categoriaController = {
    async listarCategorias(req, res, next) {
        try {
            const categorias = await Categoria.findAll({
                order: [['nome', 'ASC']]
            })
            res.json(categorias)
        } catch (error) {
            next(error)
        }
    },

    async criarCategoria(req, res, next) {
        try {
            const { nome, descricao, icone, ativo = true } = req.body

            if (!nome) {
                return res.status(400).json({ erro: "Nome da categoria é obrigatório" })
            }

            // Verificar se categoria já existe
            const categoriaExistente = await Categoria.findOne({ where: { nome } })
            if (categoriaExistente) {
                return res.status(400).json({ erro: "Já existe uma categoria com este nome" })
            }

            const categoria = await Categoria.create({
                nome,
                descricao,
                icone: icone || 'GiHanger',
                ativo
            })

            res.status(201).json(categoria)
        } catch (error) {
            next(error)
        }
    },

    async buscarCategoria(req, res, next) {
        try {
            const { id } = req.params

            const categoria = await Categoria.findByPk(id)
            if (!categoria) {
                return res.status(404).json({ erro: "Categoria não encontrada" })
            }

            res.json(categoria)
        } catch (error) {
            next(error)
        }
    },

    async atualizarCategoria(req, res, next) {
        try {
            const { id } = req.params
            const { nome, descricao, icone, ativo } = req.body

            const categoria = await Categoria.findByPk(id)
            if (!categoria) {
                return res.status(404).json({ erro: "Categoria não encontrada" })
            }

            // Verificar se nome já existe em outra categoria
            if (nome && nome !== categoria.nome) {
                const categoriaExistente = await Categoria.findOne({ where: { nome } })
                if (categoriaExistente) {
                    return res.status(400).json({ erro: "Já existe uma categoria com este nome" })
                }
            }

            // Atualizar dados
            if (nome) categoria.nome = nome
            if (descricao !== undefined) categoria.descricao = descricao
            if (icone !== undefined) categoria.icone = icone
            if (ativo !== undefined) categoria.ativo = ativo

            await categoria.save()

            res.json(categoria)
        } catch (error) {
            next(error)
        }
    },

    async removerCategoria(req, res, next) {
        try {
            const { id } = req.params

            const categoria = await Categoria.findByPk(id)
            if (!categoria) {
                return res.status(404).json({ erro: "Categoria não encontrada" })
            }

            await categoria.destroy()

            res.json({ mensagem: "Categoria removida com sucesso" })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = categoriaController 