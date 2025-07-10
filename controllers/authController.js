const authService = require("../services/authService")

const authController = {
  async loginComGoogle(req, res, next) {
    try {
      const { googleToken } = req.body

      if (!googleToken) {
        return res.status(400).json({ erro: "Token do Google é obrigatório" })
      }

      const resultado = await authService.autenticarComGoogle(googleToken)
      res.json(resultado)
    } catch (error) {
      if (error.message.startsWith("Erro na autenticação com Google:")) {
        return res.status(401).json({ erro: "Falha na autenticação com Google." })
      }
      next(error)
    }
  },

  async login(req, res, next) {
    try {
      const { email, senha } = req.body

      if (!email || !senha) {
        return res.status(400).json({ erro: "Email e senha são obrigatórios" })
      }
 
      const resultado = await authService.autenticarComCredenciais(email, senha)
      res.json(resultado)
    } catch (error) {
      if (error.message === "Credenciais inválidas") {
        return res.status(401).json({ erro: error.message })
      }
      next(error)
    }
  },

  async registrar(req, res, next) {
    try {
      const resultado = await authService.registrarUsuario(req.body)
      res.status(201).json(resultado)
    } catch (error) {
      if (error.message === "Email já cadastrado") {
        return res.status(409).json({ erro: error.message })
      }
      next(error)
    }
  },

  async recuperarSenha(req, res, next) {
    try {
      const { email } = req.body

      if (!email) {
        return res.status(400).json({ erro: "Email é obrigatório" })
      }

      const resultado = await authService.recuperarSenha(email)
      res.json(resultado)
    } catch (error) {
      if (error.message === "Usuário não encontrado") {
        return res.status(404).json({ erro: error.message })
      }
      next(error)
    }
  },

  async alterarSenha(req, res, next) {
    try {
      const { token, novaSenha } = req.body

      if (!token || !novaSenha) {
        return res.status(400).json({ erro: "Token e nova senha são obrigatórios" })
      }

      const resultado = await authService.alterarSenha(token, novaSenha)
      res.json(resultado)
    } catch (error) {
      if (error.message === "Token inválido" || error.message === "Usuário não encontrado") {
        return res.status(401).json({ erro: error.message })
      }
      next(error)
    }
  },
 async criarAdmin(req, res, next) {
    try {
      const { nome, email, senha, adminKey } = req.body;

      if (adminKey !== process.env.ADMIN_CREATION_KEY) {
        return res.status(403).json({ erro: "Chave de criação de administrador inválida." });
      }

      if (!nome || !email || !senha) {
        return res.status(400).json({ erro: "Nome, email e senha são obrigatórios." });
      }
      
      const admin = await authService.criarUsuarioAdmin({ nome, email, senha });

      res.status(201).json({ mensagem: "Administrador criado com sucesso!", admin });

    } catch (error) {
      if (error.message === "Email já cadastrado") {
        return res.status(409).json({ erro: error.message });
      }
      next(error);
    }
  },



  async handleMelhorEnvioCallback(req, res, next) {
    try {
      const { code } = req.query;

      if (!code) {
        // Se não houver código, redireciona para uma página de erro no frontend
        return res.redirect(`${process.env.FRONTEND_URL}/admin/settings/integrations?error=authorization_failed`);
      }

      await authService.processarCallbackMelhorEnvio(code);

      // Após salvar os tokens, redireciona o usuário para uma página de sucesso no painel admin
      res.redirect(`${process.env.FRONTEND_URL}/admin/settings/integrations?success=true`);

    } catch (error) {
      // Em caso de erro, redireciona para a página de erro
      res.redirect(`${process.env.FRONTEND_URL}/admin/settings/integrations?error=${error.message}`);
      next(error); // Opcional, para logar o erro no servidor
    }
  },



}

module.exports = authController
