const { PostBlog, Usuario } = require("../models")
const { enviarEmail, templateNovoPost } = require("../utils/email")

const blogService = {
  async criarPost(dados) {
    try {
      const slug = dados.titulo
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      const post = await PostBlog.create({
        ...dados,
        slug,
      })

      return post
    } catch (error) {
      throw error
    }
  },

  async atualizarPost(id, dados) {
    try {
      const post = await PostBlog.findByPk(id)
      if (!post) {
        throw new Error("Post não encontrado")
      }

      if (dados.titulo) {
        dados.slug = dados.titulo
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      }

      await post.update(dados)
      return post
    } catch (error) {
      throw error
    }
  },

  async listarPostsPublicados(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit

      const { count, rows } = await PostBlog.findAndCountAll({
        where: { status: "publicado" },
        include: [{ model: Usuario, attributes: ["nome"] }],
        limit: Number.parseInt(limit),
        offset,
        order: [["publicadoEm", "DESC"]],
      })

      return {
        posts: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number.parseInt(page),
      }
    } catch (error) {
      throw error
    }
  },

  async buscarPostPorSlug(slug) {
    try {
      const post = await PostBlog.findOne({
        where: { slug, status: "publicado" },
        include: [{ model: Usuario, attributes: ["nome"] }],
      })

      if (!post) {
        throw new Error("Post não encontrado")
      }

      return post
    } catch (error) {
      throw error
    }
  },

  async aprovarPost(id) {
    try {
      const post = await PostBlog.findByPk(id, {
        include: [{ model: Usuario, attributes: ["nome"] }],
      })

      if (!post) {
        throw new Error("Post não encontrado")
      }

      post.status = "publicado"
      post.publicadoEm = new Date()
      await post.save()

      // Enviar email para usuários (implementar lista de emails)
      // await enviarEmail(
      //   'usuarios@exemplo.com',
      //   'Novo Post no Blog',
      //   templateNovoPost(post)
      // );

      return post
    } catch (error) {
      throw error
    }
  },

  async excluirPost(id) {
    try {
      const post = await PostBlog.findByPk(id);
      if (!post) {
        throw new Error("Post não encontrado");
      }
      await post.destroy();
      return { mensagem: "Post excluído com sucesso" };
    } catch (error) {
      throw error;
    }
  },
}

module.exports = blogService
