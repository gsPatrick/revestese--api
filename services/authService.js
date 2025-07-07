const bcrypt = require("bcryptjs")
const { OAuth2Client } = require("google-auth-library")
const { Usuario } = require("../models")
const { gerarToken, verificarToken } = require("../utils/jwt")
const { enviarEmail } = require("../utils/email")
const crypto = require("crypto")
const configuracaoLojaService = require("./configuracaoLojaService") // Importe o serviço de configuração

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const authService = {
  async autenticarComGoogle(googleToken) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })

      const payload = ticket.getPayload()
      const { sub: googleId, email, name } = payload

      let usuario = await Usuario.findOne({ where: { googleId } })

      if (!usuario) {
        usuario = await Usuario.findOne({ where: { email } })
        if (usuario) {
          usuario.googleId = googleId
          await usuario.save()
        } else {
          usuario = await Usuario.create({
            nome: name,
            email,
            googleId,
            tipo: "cliente",
          })
        }
      }

      const token = gerarToken({ id: usuario.id, email: usuario.email })

      return {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
        },
        token,
      }
    } catch (error) {
      throw new Error("Erro na autenticação com Google: " + error.message)
    }
  },

  async processarCallbackMelhorEnvio(code) {
    try {
      console.log("Processando código de autorização do Melhor Envio...");

      const response = await axios.post(process.env.ME_AUTH_URL, {
        grant_type: 'authorization_code',
        client_id: process.env.ME_CLIENT_ID,
        client_secret: process.env.ME_CLIENT_SECRET,
        redirect_uri: process.env.ME_REDIRECT_URI,
        code: code,
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': `DoodleDreamsApp (${process.env.ME_CONTACT_EMAIL})`
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;
      
      if (!access_token || !refresh_token) {
        throw new Error("Resposta da API do Melhor Envio não contém os tokens necessários.");
      }

      // Calcula quando o token vai expirar e salva como string ISO
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Salva os tokens e a data de expiração no banco de dados usando o serviço de configuração
      await configuracaoLojaService.atualizarConfiguracoes({
        ME_ACCESS_TOKEN: access_token,
        ME_REFRESH_TOKEN: refresh_token,
        ME_EXPIRES_AT: expiresAt,
      });

      console.log("Tokens do Melhor Envio obtidos e salvos com sucesso.");

      return { success: true };

    } catch (error) {
      console.error("Erro CRÍTICO ao processar callback do Melhor Envio:", error.response?.data || error.message);
      throw new Error("Falha ao obter tokens do Melhor Envio.");
    }
  },

  async autenticarComCredenciais(email, senha) {
    try {
      const usuario = await Usuario.findOne({ where: { email, ativo: true } })

      if (!usuario || !usuario.senhaHash) {
        throw new Error("Credenciais inválidas")
      }
 
      const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
      if (!senhaValida) {
        throw new Error("Credenciais inválidas")
      }

      const token = gerarToken({ id: usuario.id, email: usuario.email })

      return {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
        },
        token,
      }
    } catch (error) {
      throw error
    }
  }, 

  async registrarUsuario(dados) {
    try {
      const { nome, email, senha } = dados

      const usuarioExistente = await Usuario.findOne({ where: { email } })
      if (usuarioExistente) {
        throw new Error("Email já cadastrado")
      }

      const senhaHash = await bcrypt.hash(senha, 10)

      const usuario = await Usuario.create({
        nome,
        email,
        senhaHash,
        tipo: "cliente",
      })

      const token = gerarToken({ id: usuario.id, email: usuario.email })

      return {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
        },
        token,
      }
    } catch (error) {
      throw error
    }
  },

  async recuperarSenha(email) {
    try {
      const usuario = await Usuario.findOne({ where: { email, ativo: true } })
      if (!usuario) {
        throw new Error("Usuário não encontrado")
      }

      const token = gerarToken({ id: usuario.id, tipo: "recuperacao" }, "1h")

      await enviarEmail(
        email,
        "Recuperação de Senha",
        `
        <h1>Recuperação de Senha</h1>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${process.env.FRONTEND_URL}/redefinir-senha?token=${token}">Redefinir Senha</a>
        <p>Este link expira em 1 hora.</p>
        `,
      )

      return { message: "Email de recuperação enviado" }
    } catch (error) {
      throw error
    }
  },

  async alterarSenha(token, novaSenha) {
    try {
      const decoded = verificarToken(token)
      if (decoded.tipo !== "recuperacao") {
        throw new Error("Token inválido")
      }

      const usuario = await Usuario.findByPk(decoded.id)
      if (!usuario) {
        throw new Error("Usuário não encontrado")
      }

      const senhaHash = await bcrypt.hash(novaSenha, 10)
      usuario.senhaHash = senhaHash
      await usuario.save()

      return { message: "Senha alterada com sucesso" }
    } catch (error) {
      throw error
    }
  },

   async criarUsuarioAdmin(dados) {
    try {
      const { nome, email, senha } = dados;

      const usuarioExistente = await Usuario.findOne({ where: { email } });
      if (usuarioExistente) {
        throw new Error("Email já cadastrado");
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      // A principal diferença: cria o usuário com tipo 'admin' e ativo
      const admin = await Usuario.create({
        nome,
        email,
        senhaHash,
        tipo: "admin", // Define o tipo como admin
        ativo: true,
      });
      
      // Retorna o objeto do admin sem a senha
      const adminData = admin.toJSON();
      delete adminData.senhaHash;
      
      return adminData;

    } catch (error) {
      throw error;
    }
  },



}
module.exports = authService
