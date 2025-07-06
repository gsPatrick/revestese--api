const blogService = require("../services/blogService")

const blogController = {
  async criarPost(req, res, next) {
    try {
      const dados = {
        ...req.body,
        autorId: req.usuario.id,
      }

      const post = await blogService.criarPost(dados)
      res.status(201).json(post)
    } catch (error) {
      next(error)
    }
  },

  async atualizarPost(req, res, next) {
    try {
      const { id } = req.params
      const post = await blogService.atualizarPost(id, req.body)
      res.json(post)
    } catch (error) {
      next(error)
    }
  },

  async listarPosts(req, res, next) {
    try {
      const { page, limit } = req.query
      const posts = await blogService.listarPostsPublicados(page, limit)
      res.json(posts)
    } catch (error) {
      next(error)
    }
  },

  async buscarPorSlug(req, res, next) {
    try {
      const { slug } = req.params
      const post = await blogService.buscarPostPorSlug(slug)
      res.json(post)
    } catch (error) {
      next(error)
    }
  },

  async aprovarPost(req, res, next) {
    try {
      const { id } = req.params
      const post = await blogService.aprovarPost(id)
      res.json(post)
    } catch (error) {
      next(error)
    }
  },

  async listarTodosAdmin(req, res, next) {
    try {
      // Apenas para admins - listar todos os posts incluindo rascunhos
      const { PostBlog, Usuario } = require("../models")
      const { page = 1, limit = 10 } = req.query
      const offset = (page - 1) * limit

      const { count, rows } = await PostBlog.findAndCountAll({
        include: [{ model: Usuario, attributes: ["nome"] }],
        limit: Number.parseInt(limit),
        offset,
        order: [["createdAt", "DESC"]],
      })

      res.json({
        posts: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number.parseInt(page),
      })
    } catch (error) {
      next(error)
    }
  },

  async uploadImagemDestaque(req, res, next) {
    try {
      if (!req.processedImage) {
        return res.status(400).json({ erro: "Nenhuma imagem processada." });
      }
      
      const imageUrl = req.processedImage.url;
      res.status(200).json({ url: imageUrl });
    } catch (error) {
      next(error);
    }
  },

  async excluirPost(req, res, next) {
    try {
      const { id } = req.params;
      const resultado = await blogService.excluirPost(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  },
}

module.exports = blogController
