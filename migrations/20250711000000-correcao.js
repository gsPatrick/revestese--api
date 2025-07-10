'use strict';
module.exports = {
    up: async (qi, Sequelize) => {
        await qi.changeColumn('assinaturas_usuario', 'enderecoEntregaId', {
            type: Sequelize.INTEGER, // ou UUID/STRING, conforme seu modelo
            allowNull: true,
        });
    },
    down: async (qi, Sequelize) => {
        await qi.changeColumn('assinaturas_usuario', 'enderecoEntregaId', {
            type: Sequelize.INTEGER, // ou UUID/STRING, conforme seu modelo
            allowNull: false,
        });
    }
};