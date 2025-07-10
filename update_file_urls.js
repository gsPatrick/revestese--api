// update_file_urls.js

require('dotenv').config(); // Certifique-se de que seu .env está configurado
const { sequelize } = require('./config/database');

const { sequelize, ArquivoProduto } = require('./models/index'); // Ajuste o caminho se necessário

async function updateFileUrls() {
  // REMOVIDO: await sequelize.sync(); // Não precisamos sincronizar o DB para atualizar dados

  const FILE_SERVER_URL = process.env.FILE_SERVER_URL; // Seu novo domínio de arquivos
  if (!FILE_SERVER_URL) {
    console.error("Erro: FILE_SERVER_URL não está definida nas variáveis de ambiente. Verifique seu .env.");
    process.exit(1);
  }

  try {
    // Garante que a conexão com o banco de dados está ativa
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    console.log(`Iniciando atualização de URLs para o File Server: ${FILE_SERVER_URL}`);

    // Busca todos os arquivos que têm URLs que não começam com a nova URL do File Server
    // ou que contenham o caminho antigo '/uploads/' (para capturar ambos os casos: relativo e backend antigo)
    const arquivosParaAtualizar = await ArquivoProduto.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { url: { [sequelize.Sequelize.Op.notLike]: `${FILE_SERVER_URL}%` } },
          { url: { [sequelize.Sequelize.Op.like]: '%/uploads/%' } } // Captura URLs com o segmento '/uploads/'
        ]
      }
    });


    if (arquivosParaAtualizar.length === 0) {
      console.log("Nenhum arquivo para atualizar encontrado. As URLs já estão corretas ou não há arquivos antigos.");
      return;
    }

    console.log(`Encontrados ${arquivosParaAtualizar.length} arquivos para atualizar.`);

    for (const arquivo of arquivosParaAtualizar) {
      let oldUrl = arquivo.url;
      let newRelativePath = oldUrl; // Caminho relativo padrão

      // Lógica para adaptar o caminho relativo ao formato esperado pelo File Server
      // Ex: /uploads/imagens/medium/nome.avif  -> /imagens/master/nome_master.avif
      // Ex: /uploads/videos/nome.mp4          -> /videos/nome.mp4
      // Ex: /uploads/produtos/nome.zip        -> /produtos/nome.zip

      if (oldUrl.includes('/uploads/imagens/')) {
        // Assume que se for imagem, queremos a versão 'master' no File Server
        // Pega o nome do arquivo após a última barra e antes da extensão
        const fileNameWithExt = path.basename(oldUrl);
        const baseName = fileNameWithExt.split('.')[0]; // nome_variante (ex: 123-abc_medium)

        // Tenta extrair o UUID original (se existir)
        let uuidPart = baseName.split('_')[0]; // Pega a primeira parte antes do _
        if (uuidPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // Se for um UUID, usa ele como base para o nome do arquivo master
            newRelativePath = `/imagens/master/${uuidPart}_master.avif`;
        } else {
            // Fallback se não for UUID ou padrão complexo: tenta pegar o nome original do arquivo
            // Isso é menos robusto e pode precisar de ajuste manual.
            newRelativePath = `/imagens/master/${baseName}_master.avif`;
            console.warn(`Aviso: UUID não detectado em ${baseName}. Usando nome base para gerar URL master.`);
        }
      } else if (oldUrl.includes('/uploads/videos/')) {
        newRelativePath = oldUrl.substring(oldUrl.indexOf('/uploads/videos/')).replace('/uploads/', '/');
      } else if (oldUrl.includes('/uploads/arquivos/')) {
        newRelativePath = oldUrl.substring(oldUrl.indexOf('/uploads/arquivos/')).replace('/uploads/', '/');
      } else if (oldUrl.includes('/uploads/produtos/')) {
        newRelativePath = oldUrl.substring(oldUrl.indexOf('/uploads/produtos/')).replace('/uploads/', '/');
      } else {
        // Se a URL não corresponde a nenhum padrão `/uploads/` conhecido,
        // mas é uma URL absoluta que não é do file server, tenta extrair o pathname.
        // Se já for uma URL completa, ela será testada contra FILE_SERVER_URL no findAll
        // e, se não corresponder, será reescrita com o novo domínio.
        try {
            const tempUrlObj = new URL(oldUrl);
            newRelativePath = tempUrlObj.pathname; // Pega apenas o caminho após o domínio
            // Certifica-se que o caminho começa com /, mas não /uploads/
            if (newRelativePath.startsWith('/uploads/')) {
                newRelativePath = newRelativePath.replace('/uploads/', '/');
            }
        } catch (e) {
            console.warn(`Aviso: URL antiga '${oldUrl}' não pôde ser parseada como URL. Tentando usar como caminho bruto.`);
            // Se não é uma URL válida, assume que é um caminho relativo que precisa de tratamento.
            // Para URLs que não tinham /uploads/, pode precisar de mais lógica aqui.
        }
      }

      // Constrói a nova URL completa
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
    // É importante fechar a conexão no final de um script de uso único
    await sequelize.close();
    process.exit(0);
  }
}

// Para usar 'path.basename', 'path.parse', etc.
const path = require('path');

// Executa a função
updateFileUrls();