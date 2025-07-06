module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "configuracoes_loja",
      [
        {
          chave: "nome_loja",
          valor: "Minha Loja Online",
          tipo: "texto",
          descricao: "Nome da loja",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          chave: "email_loja",
          valor: "contato@minhaloja.com",
          tipo: "texto",
          descricao: "Email de contato",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          chave: "telefone_loja",
          valor: "(11) 99999-9999",
          tipo: "texto",
          descricao: "Telefone de contato",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          chave: "endereco_loja",
          valor: "Rua Exemplo, 123 - São Paulo, SP",
          tipo: "texto",
          descricao: "Endereço da loja",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          chave: "cor_primaria",
          valor: "#3B82F6",
          tipo: "texto",
          descricao: "Cor primária do tema",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          chave: "frete_gratis_valor",
          valor: "100",
          tipo: "numero",
          descricao: "Valor mínimo para frete grátis",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          chave: "ativo",
          valor: "true",
          tipo: "booleano",
          descricao: "Loja ativa",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("configuracoes_loja", null, {})
  },
}
