// src/database/migrations/YYYYMMDDHHMMSS-update-arquivo-produto-for-file-server.js
// Lembre-se de substituir YYYYMMDDHHMMSS pela data e hora reais quando gerar o arquivo.

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // A coluna 'url' e 'metadados' já existem e seus tipos (STRING e JSON)
    // são adequados para armazenar URLs completas e o objeto de variantes do File Server.
    // Portanto, não há necessidade de adicionar ou alterar essas colunas para a nova funcionalidade.

    // No entanto, é uma boa prática adicionar onDelete: 'CASCADE' à chave estrangeira
    // para garantir que os registros de arquivos sejam removidos do DB quando o produto for excluído.
    // Isso é uma alteração na restrição da chave estrangeira.

    // IMPORTANTE: Antes de executar esta migração, verifique se a coluna `produtoId`
    // na sua tabela `arquivos_produto` não possui dados inconsistentes
    // (IDs de produto que não existem mais). Se tiver, corrija-os primeiro.
    await queryInterface.changeColumn('arquivos_produto', 'produto_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Mantém o allowNull como está no seu modelo atual
      references: {
        model: 'produtos',
        key: 'id',
      },
      onUpdate: 'CASCADE', // Atualiza o FK se o ID do produto mudar
      onDelete: 'CASCADE', // Remove o registro do arquivo se o produto for excluído
    });

    // Se você tiver uma coluna `url` que não era STRING, ou `metadados` que não era JSON
    // e PRECISA ser mudada, adicione um `changeColumn` aqui.
    // Exemplo (APENAS SE NECESSÁRIO E SE SEU MODELO ATUAL ESTIVER DIFERENTE):
    // await queryInterface.changeColumn('arquivos_produto', 'url', {
    //   type: Sequelize.STRING,
    //   allowNull: false,
    // });
    // await queryInterface.changeColumn('arquivos_produto', 'metadados', {
    //   type: Sequelize.JSON,
    //   allowNull: true,
    //   defaultValue: {},
    // });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverte a alteração da restrição da chave estrangeira para onDelete: 'SET NULL' (ou similar)
    // Se o seu modelo original não tinha onDelete, 'SET NULL' é um bom padrão para o down.
    await queryInterface.changeColumn('arquivos_produto', 'produto_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'produtos',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Reverte para o comportamento padrão ou anterior
    });
  }
};