// src/services/uploadService.js

const path = require("path")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")
const dotenv = require("dotenv")
const axios = require('axios'); // Importar axios

dotenv.config()

// URL base do seu novo File Server
// Defina isso como uma variável de ambiente no EasyPanel para o seu backend
// Ex: FILE_SERVER_URL=https://seuservicodearquivos.easypanel.host
const FILE_SERVER_URL = process.env.FILE_SERVER_URL || 'http://localhost:8080'; // Porta padrão do file server

// Remova a criação local de diretórios, o file server fará isso
// const criarDiretorios = () => { ... }
// criarDiretorios()


const uploadService = {
  // Função auxiliar para enviar arquivos para o File Server
  async sendFileToFileServer(buffer, originalname, type, filename = uuidv4()) {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: originalname.mimetype });
    formData.append('file', blob, originalname.originalname); // filename no multer

    formData.append('type', type); // Tipo para o file server (imagens, videos, arquivos, produtos)
    formData.append('filename', filename); // O nome do arquivo que será salvo (UUID)

    try {
      const response = await axios.post(`${FILE_SERVER_URL}/upload/${type === 'imagens' ? 'image' : 'file'}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Opcional: Adicione um token de segurança (x-api-key) se o file server exigir
          // 'x-api-key': process.env.FILE_SERVER_API_KEY
        },
      });
      return response.data; // Retorna os dados do file server (filename, url, variants etc.)
    } catch (error) {
      console.error(`Erro ao enviar arquivo para o File Server (${type}):`, error.response?.data || error.message);
      throw new Error(`Falha ao carregar arquivo para o servidor de arquivos.`);
    }
  },

  // Processar e salvar imagem otimizada (agora envia para o File Server)
  async processarESalvarImagem(file, options = {}) {
    try {
      // Aqui, o processamento Sharp AINDA ACONTECE NO SEU BACKEND
      // Você pode optar por enviar o buffer original e deixar o File Server fazer o Sharp
      // ou fazer o Sharp aqui e enviar o resultado (para maior controle)
      // Com base no seu server.js do file-server, ele fará o sharp, então só precisamos enviar o buffer original.

      // Gerar um UUID para o nome do arquivo, que será repassado para o file server
      const uniqueFileName = uuidv4(); 

      const result = await this.sendFileToFileServer(file.buffer, file, 'imagens', uniqueFileName);

      // O `mainUrl` já virá do File Server como '/imagens/master/UUID_master.avif'
      // Precisamos concatenar com a URL base do File Server para ter a URL completa no DB
      const fullUrl = `${FILE_SERVER_URL}${result.mainUrl}`;

      const arquivoInfo = {
        nomeOriginal: file.originalname,
        nomeArquivo: result.filename, // O UUID gerado
        caminho: null, // Não armazenamos mais caminho local
        url: fullUrl, // URL COMPLETA para armazenar no banco
        fullUrl: fullUrl, // Mesma URL completa para o frontend
        tamanho: result.variants.master.avif.size, // Pega o tamanho da versão master AVIF
        tipo: "image/avif", // Sempre AVIF após processamento
        categoria: 'imagem',
        otimizado: true,
        // Armazenar metadados das variantes para futuras consultas
        metadados: result.variants
      };

      return arquivoInfo;
    } catch (error) {
      throw error;
    }
  },

  // Processar múltiplas imagens (envia uma a uma para o File Server)
  async processarMultiplasImagens(files, options = {}) {
    const processedImages = [];
    for (const file of files) {
      try {
        const uniqueFileName = uuidv4();
        const result = await this.sendFileToFileServer(file.buffer, file, 'imagens', uniqueFileName);
        const fullUrl = `${FILE_SERVER_URL}${result.mainUrl}`;

        processedImages.push({
          nomeOriginal: file.originalname,
          nomeArquivo: result.filename,
          caminho: null,
          url: fullUrl,
          fullUrl: fullUrl,
          tamanho: result.variants.master.avif.size,
          tipo: "image/avif",
          categoria: "imagem",
          otimizado: true,
          metadados: result.variants
        });
      } catch (error) {
        console.error(`Erro ao processar ${file.originalname}:`, error);
        // Continuar processando outras imagens mesmo se uma falhar
      }
    }
    return processedImages;
  },

  // Criar diferentes tamanhos de imagem (thumbnails) - **Esta função pode ser removida se o File Server já fizer isso**
  // Se o File Server já retorna as URLs das variantes, esta função se torna redundante.
  // Mantenho-a aqui caso você queira a capacidade de processar localmente e depois enviar.
  async criarVariantesImagem(file, baseName) {
    // Se o `processarESalvarImagem` já retorna variantes do File Server, esta função não é mais necessária como antes.
    // Ela pode ser adaptada para apenas retornar as URLs das variantes que o File Server já gerou.
    console.warn("criarVariantesImagem pode ser redundante se o File Server já gerenciar variantes.");
    // Exemplo de como poderia funcionar se o file server gerou:
    // Você teria que chamar processarESalvarImagem e extrair as variantes de lá.
    const result = await this.sendFileToFileServer(file.buffer, file, 'imagens', baseName); // Reusa o baseName como filename
    const variants = {};
    for (const sizeName in result.variants) {
      variants[sizeName] = {};
      for (const format in result.variants[sizeName]) {
        variants[sizeName][format] = {
          fileName: path.basename(result.variants[sizeName][format].path),
          url: `${FILE_SERVER_URL}${result.variants[sizeName][format].path}`,
          fullUrl: `${FILE_SERVER_URL}${result.variants[sizeName][format].path}`,
          size: result.variants[sizeName][format].size,
          // Não temos as dimensões exatas aqui, a menos que o File Server as retorne
          dimensions: {} // Preencher se o File Server retornar
        };
      }
    }
    return variants;
  },

  // Salvar arquivo não-imagem (envia para o File Server)
  async salvarArquivo(file, tipo = "geral") {
    try {
      let fileServerType; // Corresponde aos diretórios do File Server
      if (file.mimetype.startsWith("video/")) {
        fileServerType = "videos";
      } else if (file.fieldname === "produto") { // Assumindo produtos digitais
        fileServerType = "produtos";
      } else {
        fileServerType = "arquivos";
      }
      
      const uniqueFileName = `${uuidv4()}-${file.originalname}`; // Mantém o original name para leitura fácil
      const result = await this.sendFileToFileServer(file.buffer, file, fileServerType, uniqueFileName);
      
      const fullUrl = `${FILE_SERVER_URL}${result.url}`;

      const arquivoInfo = {
        nomeOriginal: file.originalname,
        nomeArquivo: result.filename, // O nome com UUID
        caminho: null, // Não armazena mais caminho local
        url: fullUrl, // URL COMPLETA
        fullUrl: fullUrl,
        tamanho: result.size,
        tipo: file.mimetype,
        categoria: tipo,
        otimizado: false, // Otimização não se aplica da mesma forma a não-imagens
      };

      return arquivoInfo;
    } catch (error) {
      throw error;
    }
  },

  // Remover arquivo do sistema (agora envia DELETE para o File Server)
  async removerArquivo(urlDoArquivo) {
    try {
      // Extrair o caminho relativo e o tipo do arquivo da URL completa
      const urlObj = new URL(urlDoArquivo);
      // O caminho será algo como /imagens/thumbnail/UUID_thumbnail.avif
      const relativePath = urlObj.pathname; 
      
      // Dividir o caminho para obter o tipo (imagens, videos, arquivos) e o nome do arquivo
      // Ex: /imagens/master/UUID_master.avif -> type='master', filename='UUID_master.avif'
      // ou /videos/meu_video.mp4 -> type='videos', filename='meu_video.mp4'
      const pathParts = relativePath.split('/').filter(Boolean); // Remove partes vazias
      const type = pathParts[0]; // 'imagens', 'videos', 'arquivos', 'produtos', ou uma variante (small, medium, etc)
      const filename = pathParts.slice(1).join('/'); // O resto do caminho é o filename

      // Para imagens, precisamos deletar TODAS as variantes.
      // O File Server `server.js` tem um endpoint `/delete/:type/:filename`.
      // Ele vai deletar o arquivo específico. Para deletar todas as variantes,
      // a lógica seria mais complexa e talvez precisasse de um endpoint /delete/image/:baseName.
      // Por enquanto, esta função só deletará o arquivo exato passado na URL.
      // Se a URL for da variante "master", só ela será deletada.
      // Você pode aprimorar o endpoint DELETE no File Server para lidar com isso.

      const response = await axios.delete(`${FILE_SERVER_URL}/delete/${type}/${filename}`, {
        // Opcional: Adicione um token de segurança
        // headers: { 'x-api-key': process.env.FILE_SERVER_API_KEY }
      });
      return response.status === 200; // Retorna true se a exclusão for bem-sucedida
    } catch (error) {
      console.error("Erro ao remover arquivo do File Server:", error.response?.data || error.message);
      return false;
    }
  },

  // Otimizar imagem existente (Agora chama o File Server ou o envia para reprocessar)
  // Esta função pode ser simplificada se o File Server gerenciar a otimização de existentes.
  async otimizarImagemExistente(imagePath) {
    console.warn("otimizarImagemExistente: Esta função pode precisar de refatoração para se adequar ao File Server.");
    // Depende de como seu File Server lida com otimização de imagens já existentes.
    // Poderia ser um GET para baixar -> otimizar localmente -> re-uploadar.
    // Ou um endpoint específico no File Server para otimizar um arquivo existente por URL/ID.
    throw new Error("Função otimizarImagemExistente precisa ser adaptada ao File Server.");
  },

  // Obter informações da imagem (pode ser obtido da URL ou metadados salvos)
  async obterInfoImagem(imagePath) {
    // Se os metadados já estão salvos no ArquivoProduto, você pode retorná-los.
    // Se precisar de metadados em tempo real de uma URL externa, é mais complexo.
    console.warn("obterInfoImagem: Esta função pode precisar de adaptação. Metadados do File Server?");
    throw new Error("Função obterInfoImagem precisa ser adaptada ao File Server.");
  },

  // Listar arquivos de um diretório (não mais aplicável localmente)
  listarArquivos(diretorio) {
    console.warn("listarArquivos: Esta função não é mais aplicável para listagem de arquivos remotos. Use uma API do File Server se precisar listar.");
    return []; // Não lista arquivos locais
  },
};

module.exports = uploadService;