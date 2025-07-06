const bcrypt = require("bcryptjs")

module.exports = {
  async up(queryInterface, Sequelize) {
    const senhaHash = await bcrypt.hash("admin123", 10)

    await queryInterface.bulkInsert(
      "usuarios",
      [
        {
          nome: "Administrador",
          email: "admin@ecommerce.com",
          senhaHash: senhaHash,
          tipo: "admin",
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      "usuarios",
      {
        email: "admin@ecommerce.com",
      },
      {},
    )
  },
}
