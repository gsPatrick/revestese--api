// update_file_urls.js

require('dotenv').config(); // Certifique-se de que seu .env está configurado

const { sequelize, ArquivoProduto } = require('./models/index'); // Ajuste o caminho se necessário

async function updateFileUrls() {
  await sequelize.sync(); // Garante que os modelos estão carregados

  const FILE_SERVER_URL = process.env.FILE_SERVER_URL; // Seu novo domínio de arquivos
  if (!FILE_SERVER_URL) {
    console.error("Erro: FILE_SERVER_URL não está definida no .env. Abortando a atualização.");
    process.exit(1);
  }

  try {
    console.log(`Iniciando atualização de URLs para o File Server: ${FILE_SERVER_URL}`);

    // Busca todos os arquivos que têm URLs relativas ou URLs do backend antigo
    const arquivosParaAtualizar = await ArquivoProduto.findAll({
      where: {
        url: {
          [sequelize.Sequelize.Op.notLike]: `${FILE_SERVER_URL}%` // URLs que NÃO começam com a nova URL do File Server
        }
      }
    });

    if (arquivosParaAtualizar.length === 0) {
      console.log("Nenhum arquivo para atualizar encontrado. As URLs já estão corretas ou não há arquivos antigos.");
      return;
    }

    console.log(`Encontrados ${arquivosParaAtualizar.length} arquivos para atualizar.`);

    for (const arquivo of arquivosParaAtualizar) {
      let oldUrl = arquivo.url;
      let newRelativePath = oldUrl;

      // Remove o domínio antigo se existir (ex: https://n8n-doodledreamsbackend.r954jc.easypanel.host/uploads/...)
      // Ou remove apenas o /uploads/ se for relativo.
      if (oldUrl.includes('/uploads/imagens/master/')) {
         // Já é o formato master, só precisa do domínio
         newRelativePath = oldUrl.substring(oldUrl.indexOf('/imagens/master/'));
      } else if (oldUrl.includes('/uploads/imagens/medium/')) {
          // Se ainda tem o formato medium/, adapta para o master/
          newRelativePath = oldUrl.substring(oldUrl.indexOf('/imagens/medium/')).replace('/imagens/medium/', '/imagens/master/').replace('.avif', '_master.avif');
      } else if (oldUrl.includes('/uploads/')) {
          // Para outros arquivos que estavam em /uploads/ (vídeos, etc.)
          newRelativePath = oldUrl.substring(oldUrl.indexOf('/uploads/')).replace('/uploads/', '/'); // Remove /uploads/
      } else {
        // Se a URL não corresponde a nenhum padrão conhecido, ou já é uma URL completa
        // mas não da do file server, tenta pegar apenas o caminho
        try {
            const tempUrl = new URL(oldUrl);
            newRelativePath = tempUrl.pathname;
        } catch (e) {
            // Se não é uma URL válida, assume que é um caminho relativo que precisa de tratamento
             console.warn(`URL estranha encontrada: ${oldUrl}. Tentando tratar como caminho relativo.`);
        }
      }

      // Constroi a nova URL completa
      const newUrl = `${FILE_SERVER_URL}${newRelativePath}`;

      if (oldUrl !== newUrl) {
        arquivo.url = newUrl;
        await arquivo.save();
        console.log(`URL atualizada para ID ${arquivo.id}: ${oldUrl} -> ${newUrl}`);
      } else {
        console.log(`URL para ID ${arquivo.id} já estava correta ou não pôde ser adaptada: ${oldUrl}`);
      }
    }

    console.log("Atualização de URLs concluída!");

  } catch (error) {
    console.error("Erro durante a atualização de URLs:", error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

updateFileUrls();