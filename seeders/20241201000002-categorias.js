module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "categorias",
      [
        {
          nome: "Eletrônicos",
          descricao: "Produtos eletrônicos em geral",
          ativa: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          nome: "Roupas",
          descricao: "Vestuário e acessórios",
          ativa: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          nome: "Livros",
          descricao: "Livros físicos e digitais",
          ativa: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          nome: "Casa e Jardim",
          descricao: "Produtos para casa e jardim",
          ativa: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("categorias", null, {})
  },
}
