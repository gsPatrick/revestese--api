const multer = require("multer")
const path = require("path")
const fs = require("fs")
const imageProcessingService = require("./imageProcessingService")

// Criar diretórios se não existirem
const criarDiretorios = () => {
  const dirs = ["uploads", "uploads/produtos", "uploads/imagens", "uploads/videos", "uploads/arquivos"]

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

criarDiretorios()

// Configuração de storage para usar memória (para processamento)
const storage = multer.memoryStorage()

// Filtros de arquivo
const fileFilter = (req, file, cb) => {
  // Tipos permitidos
  const allowedTypes = {
    image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    video: ["video/mp4", "video/avi", "video/mov", "video/wmv"],
    document: ["application/pdf", "application/zip", "application/rar"],
    audio: ["audio/mp3", "audio/wav", "audio/ogg"],
  }

  const allAllowedTypes = [
    ...allowedTypes.image,
    ...allowedTypes.video,
    ...allowedTypes.document,
    ...allowedTypes.audio,
  ]

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`), false)
  }
}

// Configurações do multer
const uploadConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
}

const upload = multer(uploadConfig)

const uploadService = {
  // Upload único
  single: (fieldName) => upload.single(fieldName),

  // Upload múltiplo
  multiple: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),

  // Upload de campos diferentes
  fields: (fields) => upload.fields(fields),

  // Processar upload de imagem de produto com otimização
  uploadImagemProduto: upload.single("imagem"),

  // Processar upload de arquivo de produto digital
  uploadArquivoProduto: upload.single("produto"),

  // Processar upload múltiplo de imagens com otimização
  uploadMultiplasImagens: upload.array("imagens", 10),

  // Processar e salvar imagem otimizada
  async processarESalvarImagem(file, tipo = "geral", options = {}) {
    try {
      if (!imageProcessingService.isValidImage(file.mimetype)) {
        throw new Error("Arquivo não é uma imagem válida")
      }

      const imagesDir = path.join("uploads", "imagens")

      // Processar imagem para AVIF
      const fileName = await imageProcessingService.processAndSaveImage(file.buffer, imagesDir, options)

      const filePath = path.join(imagesDir, fileName)
      const fileStats = fs.statSync(filePath)
      const relativePath = `/uploads/imagens/${fileName}`
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035'

      const arquivoInfo = {
        nomeOriginal: file.originalname,
        nomeArquivo: fileName,
        caminho: filePath,
        url: relativePath, // Caminho relativo para armazenar no banco
        fullUrl: new URL(relativePath, baseUrl).href, // URL completa para o frontend
        tamanho: fileStats.size,
        tipo: "image/avif", // Sempre AVIF após processamento
        categoria: tipo,
        otimizado: true,
      }

      return arquivoInfo
    } catch (error) {
      throw error
    }
  },

  // Processar múltiplas imagens
  async processarMultiplasImagens(files, options = {}) {
    try {
      const imagesDir = path.join("uploads", "imagens")
      const processedImages = await imageProcessingService.processMultipleImages(files, imagesDir, options)
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035'

      return processedImages.map((img) => ({
        nomeOriginal: img.original,
        nomeArquivo: img.processed,
        caminho: img.path,
        url: img.url, // Já é o caminho relativo
        fullUrl: new URL(img.url, baseUrl).href, // URL completa para o frontend
        tamanho: img.size,
        tipo: "image/avif",
        categoria: "imagem",
        otimizado: true,
      }))
    } catch (error) {
      throw error
    }
  },

  // Criar variantes de imagem (thumbnails)
  async criarVariantesImagem(file, baseName) {
    try {
      if (!imageProcessingService.isValidImage(file.mimetype)) {
        throw new Error("Arquivo não é uma imagem válida")
      }

      const imagesDir = path.join("uploads", "imagens")
      const variants = await imageProcessingService.createImageVariants(file.buffer, imagesDir, baseName)

      return variants
    } catch (error) {
      throw error
    }
  },

  // Salvar arquivo não-imagem (sem processamento)
  async salvarArquivo(file, tipo = "geral") {
    try {
      let uploadPath = "uploads/"

      // Definir pasta baseado no tipo de arquivo
      if (file.mimetype.startsWith("video/")) {
        uploadPath += "videos/"
      } else if (file.fieldname === "produto") {
        uploadPath += "produtos/"
      } else {
        uploadPath += "arquivos/"
      }

      // Criar diretório se não existir
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true })
      }

      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`
      const filePath = path.join(uploadPath, fileName)

      // Salvar arquivo
      fs.writeFileSync(filePath, file.buffer)

      const fileStats = fs.statSync(filePath)
      const relativePath = `/${uploadPath}${fileName}`
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035'

      const arquivoInfo = {
        nomeOriginal: file.originalname,
        nomeArquivo: fileName,
        caminho: filePath,
        url: relativePath, // Caminho relativo para armazenar no banco
        fullUrl: new URL(relativePath, baseUrl).href, // URL completa para o frontend
        tamanho: fileStats.size,
        tipo: file.mimetype,
        categoria: tipo,
        otimizado: false,
      }

      return arquivoInfo
    } catch (error) {
      throw error
    }
  },

  // Remover arquivo do sistema
  async removerArquivo(caminho) {
    try {
      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho)
        return true
      }
      return false
    } catch (error) {
      console.error("Erro ao remover arquivo:", error)
      return false
    }
  },

  // Otimizar imagem existente
  async otimizarImagemExistente(imagePath) {
    try {
      const outputDir = path.join("uploads", "imagens")
      const result = await imageProcessingService.optimizeExistingImage(imagePath, outputDir)
      return result
    } catch (error) {
      throw error
    }
  },

  // Obter informações de imagem
  async obterInfoImagem(imagePath) {
    try {
      return await imageProcessingService.getImageInfo(imagePath)
    } catch (error) {
      throw error
    }
  },

  // Listar arquivos de um diretório
  listarArquivos(diretorio) {
    try {
      const caminhoCompleto = path.join("uploads", diretorio)
      if (!fs.existsSync(caminhoCompleto)) {
        return []
      }

      const baseUrl = process.env.BASE_URL || 'http://localhost:3035'
      
      return fs.readdirSync(caminhoCompleto).map((arquivo) => {
        const relativePath = `/${caminhoCompleto}/${arquivo}`
        return {
          nome: arquivo,
          caminho: path.join(caminhoCompleto, arquivo),
          url: relativePath, // Caminho relativo para armazenar no banco
          fullUrl: new URL(relativePath, baseUrl).href, // URL completa para o frontend
        }
      })
    } catch (error) {
      throw error
    }
  },
}

module.exports = uploadService
