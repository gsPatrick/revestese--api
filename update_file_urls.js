// update_file_urls.js

require('dotenv').config(); // Certifique-se de que seu .env está configurado
const { sequelize } = require('./config/database');

const {ArquivoProduto } = require('./models/index'); // Ajuste o caminho se necessário
const path = require('path'); // Adicionar import de path

async function updateFileUrls() {
  const FILE_SERVER_URL = process.env.FILE_SERVER_URL;
  if (!FILE_SERVER_URL) {
    console.error("Erro: FILE_SERVER_URL não está definida nas variáveis de ambiente. Verifique seu .env.");
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    console.log(`Iniciando atualização de URLs para o File Server: ${FILE_SERVER_URL}`);

    const arquivosParaAtualizar = await ArquivoProduto.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { url: { [sequelize.Sequelize.Op.notLike]: `${FILE_SERVER_URL}%` } }, // Não é a URL do file server
          { url: { [sequelize.Sequelize.Op.like]: '%/uploads/%' } }, // Contém o caminho antigo
          { url: { [sequelize.Sequelize.Op.like]: 'uploads/%' } } // Contém o caminho antigo sem barra inicial
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
      let newRelativePath = oldUrl; // Inicia com a URL antiga
      let updated = false;

      // REGRA 1: Imagens (convertendo para /imagens/master/UUID_master.avif)
      if (oldUrl.includes('/uploads/imagens/')) {
        const fileNameWithExt = path.basename(oldUrl);
        const baseName = fileNameWithExt.split('.')[0];
        const uuidMatch = baseName.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        
        let uuidExtracted = uuidMatch ? uuidMatch[1] : baseName;
        if (!uuidMatch) {
            console.warn(`Aviso: UUID não detectado em ${baseName} (ID ${arquivo.id}). Usando nome base para gerar URL master.`);
        }
        newRelativePath = `/imagens/master/${uuidExtracted}_master.avif`;
        updated = true;
      } 
      // REGRA 2: Outros tipos de arquivos (vídeos, arquivos, produtos, temp)
      else if (oldUrl.includes('/uploads/')) {
          // Pega o caminho a partir de '/uploads/'
          let startIndex = oldUrl.indexOf('/uploads/');
          newRelativePath = oldUrl.substring(startIndex + '/uploads/'.length);
          newRelativePath = `/${newRelativePath}`; // Garante a barra inicial
          updated = true;
      } 
      // REGRA 3: Caminhos relativos antigos que não começam com '/uploads/' mas com 'uploads/'
      else if (oldUrl.startsWith('uploads/')) {
          newRelativePath = `/${oldUrl}`; // Apenas adiciona a barra inicial
          updated = true;
      } else {
          // Se não caiu em nenhuma regra de /uploads/ ou uploads/,
          // tenta parsear como URL e extrair o pathname, mas sem assumir /uploads/
          try {
              const tempUrlObj = new URL(oldUrl);
              let pathname = tempUrlObj.pathname;
              if (pathname && !pathname.startsWith('/')) { // Garantir barra inicial se for pathname
                  pathname = '/' + pathname;
              }
              newRelativePath = pathname;
              updated = true;
          } catch (e) {
              console.warn(`Aviso: URL antiga '${oldUrl}' (ID ${arquivo.id}) não pôde ser parseada como URL nem identificada como caminho '/uploads/'. Mantendo como está. Pode precisar de ajuste manual.`);
              // Se não for atualizado por nenhuma regra, updated permanece false
          }
      }

      // Se a URL foi atualizada ou é uma URL absoluta que não é do File Server, tenta reescrever
      if (updated || !oldUrl.startsWith(FILE_SERVER_URL)) {
          const newUrl = `${FILE_SERVER_URL}${newRelativePath}`;
          if (oldUrl !== newUrl) {
            arquivo.url = newUrl;
            await arquivo.save();
            console.log(`URL atualizada para ID ${arquivo.id}: ${oldUrl} -> ${newUrl}`);
          } else if (updated) { // Se o script tentou atualizar, mas a URL ficou igual (e não é do File Server)
             console.log(`URL para ID ${arquivo.id} parecia necessitar de atualização, mas permaneceu inalterada: ${oldUrl}.`);
          }
      } else {
          console.log(`URL para ID ${arquivo.id} já estava correta: ${oldUrl}`);
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