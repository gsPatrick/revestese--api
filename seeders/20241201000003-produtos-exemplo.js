module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "produtos",
      [
        {
          nome: "Smartphone Samsung Galaxy",
          descricao: "Smartphone com tela de 6.1 polegadas, 128GB de armazenamento",
          preco: 1299.99,
          imagens: JSON.stringify(["/images/smartphone1.jpg", "/images/smartphone2.jpg"]),
          categoria: "Eletrônicos",
          tipo: "fisico",
          estoque: 50,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          nome: "E-book: Programação JavaScript",
          descricao: "Guia completo para aprender JavaScript do zero",
          preco: 29.99,
          imagens: JSON.stringify(["/images/ebook-js.jpg"]),
          categoria: "Livros",
          tipo: "digital",
          estoque: 0,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          nome: "Camiseta Básica",
          descricao: "Camiseta 100% algodão, disponível em várias cores",
          preco: 39.9,
          imagens: JSON.stringify(["/images/camiseta1.jpg"]),
          categoria: "Roupas",
          tipo: "fisico",
          estoque: 100,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("produtos", null, {})
  },
}
