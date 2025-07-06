const sharp = require("sharp")
const path = require("path")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")
const dotenv = require("dotenv")

dotenv.config()

const imageProcessingService = {
  // Função para processar e salvar a imagem como AVIF
  async processAndSaveImage(buffer, imagesDir, options = {}) {
    const fileName = `${uuidv4()}.avif`
    const fullPath = path.join(imagesDir, fileName)

    try {
      const {
        quality = 40, // Qualidade ainda mais baixa para teste
        maxWidth = 900, // Reduzido para uso web/mobile
        maxHeight = 900,
        optimizeForSpeed = true,
        progressive = true,
      } = options

      let sharpInstance = sharp(buffer, {
        failOnError: false,
        limitInputPixels: 50000000,
      })

      // Remover metadados para reduzir tamanho
      sharpInstance = sharpInstance.withMetadata(false)

      // Pipeline otimizado de processamento
      await sharpInstance
        .resize({
          width: maxWidth,
          height: maxHeight,
          withoutEnlargement: true,
          fastShrink: true,
          fit: "inside", // Garante que a imagem caiba nas dimensões
        })
        .avif({
          quality: quality,
          effort: optimizeForSpeed ? 1 : 3, // Ainda mais rápido
          chromaSubsampling: "4:2:0",
          lossless: false, // Garante compressão com perdas
          force: true,
        })
        .toFile(fullPath)

      return fileName
    } catch (error) {
      console.error("Erro ao processar imagem:", error)

      // Fallback para WebP (mais eficiente que JPEG)
      try {
        const webpFileName = `${uuidv4()}.webp`
        const webpFullPath = path.join(imagesDir, webpFileName)

        await sharp(buffer, {
          failOnError: false,
          limitInputPixels: 50000000,
        })
          .resize({
            width: options.maxWidth,
            height: options.maxHeight,
            withoutEnlargement: true,
            fastShrink: true,
            fit: "inside",
          })
          .withMetadata(false) // Remover metadados no fallback
          .webp({
            quality: 60, // Qualidade reduzida
            effort: options.optimizeForSpeed ? 1 : 3,
            force: true,
          })
          .toFile(webpFullPath)

        return webpFileName
      } catch (fallbackError) {
        console.error("Erro no fallback para WebP:", fallbackError)
        throw new Error("Falha ao processar a imagem")
      }
    }
  },

  // Processar múltiplas imagens
  async processMultipleImages(files, imagesDir, options = {}) {
    const processedImages = []
    const baseUrl = process.env.BASE_URL || 'http://localhost:3035'

    for (const file of files) {
      try {
        const fileName = await this.processAndSaveImage(file.buffer, imagesDir, options)
        const relativePath = `/uploads/imagens/${fileName}`
        processedImages.push({
          original: file.originalname,
          processed: fileName,
          path: path.join(imagesDir, fileName),
          url: relativePath, // Salva o caminho relativo no banco
          fullUrl: new URL(relativePath, baseUrl).href, // URL completa para uso no frontend
          size: fs.statSync(path.join(imagesDir, fileName)).size,
        })
      } catch (error) {
        console.error(`Erro ao processar ${file.originalname}:`, error)
        // Continuar processando outras imagens
      }
    }

    return processedImages
  },

  // Criar diferentes tamanhos de imagem (thumbnails)
  async createImageVariants(buffer, imagesDir, baseName) {
    const variants = {
      thumbnail: { width: 150, height: 150, quality: 50 },
      small: { width: 300, height: 300, quality: 60 },
      medium: { width: 600, height: 600, quality: 70 },
      large: { width: 1200, height: 1200, quality: 80 },
    }

    const processedVariants = {}
    const baseUrl = process.env.BASE_URL || 'http://localhost:3035'

    for (const [variantName, config] of Object.entries(variants)) {
      try {
        const fileName = `${baseName}_${variantName}_${uuidv4()}.avif`
        const fullPath = path.join(imagesDir, fileName)
        const relativePath = `/uploads/imagens/${fileName}`

        await sharp(buffer, {
          failOnError: false,
          limitInputPixels: 50000000,
        })
          .withMetadata(false)
          .resize({
            width: config.width,
            height: config.height,
            withoutEnlargement: true,
            fastShrink: true,
            fit: "inside",
          })
          .avif({
            quality: config.quality,
            effort: 1,
            chromaSubsampling: "4:2:0",
            lossless: false,
            force: true,
          })
          .toFile(fullPath)

        processedVariants[variantName] = {
          fileName,
          url: relativePath, // Salva o caminho relativo no banco
          fullUrl: new URL(relativePath, baseUrl).href, // URL completa para uso no frontend
          size: fs.statSync(fullPath).size,
          dimensions: config,
        }
      } catch (error) {
        console.error(`Erro ao criar variante ${variantName}:`, error)
      }
    }

    return processedVariants
  },

  // Otimizar imagem existente
  async optimizeExistingImage(imagePath, outputDir = null) {
    try {
      const outputPath = outputDir || path.dirname(imagePath)
      const fileName = `optimized_${uuidv4()}.avif`
      const fullPath = path.join(outputPath, fileName)
      const relativePath = `/uploads/imagens/${fileName}`
      const baseUrl = process.env.BASE_URL || 'http://localhost:3035'

      await sharp(imagePath)
        .withMetadata(false)
        .resize({
          width: 900,
          height: 900,
          withoutEnlargement: true,
          fastShrink: true,
          fit: "inside",
        })
        .avif({
          quality: 40,
          effort: 1,
          chromaSubsampling: "4:2:0",
          lossless: false,
          force: true,
        })
        .toFile(fullPath)

      return {
        fileName,
        url: relativePath, // Salva o caminho relativo no banco
        fullUrl: new URL(relativePath, baseUrl).href, // URL completa para uso no frontend
        size: fs.statSync(fullPath).size,
      }
    } catch (error) {
      console.error("Erro ao otimizar imagem existente:", error)
      throw error
    }
  },

  // Validar se arquivo é uma imagem
  isValidImage(mimetype) {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/avif"]
    return validTypes.includes(mimetype)
  },

  // Obter informações da imagem
  async getImageInfo(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata()
      const stats = fs.statSync(imagePath)

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: stats.size,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
      }
    } catch (error) {
      console.error("Erro ao obter informações da imagem:", error)
      throw error
    }
  },
}

module.exports = imageProcessingService
