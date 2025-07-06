module.exports = {
  async up(queryInterface, Sequelize) {
    const dataFutura = new Date()
    dataFutura.setMonth(dataFutura.getMonth() + 6) // 6 meses no futuro

    await queryInterface.bulkInsert(
      "cupons",
      [
        {
          codigo: "BEMVINDO10",
          valor: 10.0,
          tipo: "percentual",
          validade: dataFutura,
          usoMaximo: 100,
          usoAtual: 0,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          codigo: "DESCONTO50",
          valor: 50.0,
          tipo: "fixo",
          validade: dataFutura,
          usoMaximo: 50,
          usoAtual: 0,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("cupons", null, {})
  },
}
