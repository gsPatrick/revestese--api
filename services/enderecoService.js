const { EnderecoUsuario } = require("../models")

const enderecoService = {
  async criarEndereco(usuarioId, dados) {
    try {
      // Se for marcado como principal, desmarcar outros endereços principais
      if (dados.principal) {
        await EnderecoUsuario.update({ principal: false }, { where: { usuarioId } })
      }

      // Compatibilidade com o retorno da API ViaCEP
      const dadosParaCriar = {
        ...dados,
        rua: dados.rua || dados.logradouro,
        cidade: dados.cidade || dados.localidade,
        estado: dados.estado || dados.uf,
        usuarioId,
      }
      delete dadosParaCriar.logradouro
      delete dadosParaCriar.localidade
      delete dadosParaCriar.uf

      // Limpar CEP para garantir que tenha apenas números
      if (dadosParaCriar.cep) {
        dadosParaCriar.cep = dadosParaCriar.cep.replace(/\D/g, "")
      }

      const endereco = await EnderecoUsuario.create(dadosParaCriar)

      return endereco
    } catch (error) {
      throw error
    }
  },

  async listarEnderecos(usuarioId) {
    try {
      const enderecos = await EnderecoUsuario.findAll({
        where: { usuarioId },
        order: [
          ["principal", "DESC"],
          ["createdAt", "DESC"],
        ],
      })

      return enderecos
    } catch (error) {
      throw error
    }
  },

  async buscarEnderecoPorId(id, usuarioId) {
    try {
      const endereco = await EnderecoUsuario.findOne({
        where: { id, usuarioId },
      })

      if (!endereco) {
        throw new Error("Endereço não encontrado")
      }

      return endereco
    } catch (error) {
      throw error
    }
  },

  async atualizarEndereco(id, usuarioId, dados) {
    try {
      const endereco = await this.buscarEnderecoPorId(id, usuarioId)

      // Se for marcado como principal, desmarcar outros endereços principais
      if (dados.principal) {
        await EnderecoUsuario.update(
          { principal: false },
          { where: { usuarioId, id: { [require("sequelize").Op.ne]: id } } },
        )
      }

      // Compatibilidade com o retorno da API ViaCEP
      const dadosParaAtualizar = {
        ...dados,
        rua: dados.rua || dados.logradouro,
        cidade: dados.cidade || dados.localidade,
        estado: dados.estado || dados.uf,
      }
      delete dadosParaAtualizar.logradouro
      delete dadosParaAtualizar.localidade
      delete dadosParaAtualizar.uf

      // Limpar CEP para garantir que tenha apenas números
      if (dadosParaAtualizar.cep) {
        dadosParaAtualizar.cep = dadosParaAtualizar.cep.replace(/\D/g, "")
      }

      await endereco.update(dadosParaAtualizar)
      return endereco
    } catch (error) {
      throw error
    }
  },

  async removerEndereco(id, usuarioId) {
    try {
      const endereco = await this.buscarEnderecoPorId(id, usuarioId)
      await endereco.destroy()
      return { message: "Endereço removido com sucesso" }
    } catch (error) {
      throw error
    }
  },

  async definirEnderecoPrincipal(id, usuarioId) {
    try {
      // Desmarcar todos os endereços como principal
      await EnderecoUsuario.update({ principal: false }, { where: { usuarioId } })

      // Marcar o endereço específico como principal
      const endereco = await this.buscarEnderecoPorId(id, usuarioId)
      endereco.principal = true
      await endereco.save()

      return endereco
    } catch (error) {
      throw error
    }
  },

  async buscarEnderecoPrincipal(usuarioId) {
    try {
      const endereco = await EnderecoUsuario.findOne({
        where: { usuarioId, principal: true },
      })

      if (!endereco) {
        return null
      }

      return endereco
    } catch (error) {
      throw error
    }
  },
}

module.exports = enderecoService
