const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Configurações de tamanhos de imagem
const imageSizes = {
    small: { width: 320, height: 320 },
    medium: { width: 640, height: 640 },
    large: { width: 1280, height: 1280 }
};

// Configurações de qualidade por formato
const formatConfig = {
    avif: { quality: 60 },
    webp: { quality: 75 }
};

// Garantir que os diretórios existam
function ensureDirectoriesExist() {
    const baseDir = path.join('uploads', 'imagens');

    // Criar diretório base se não existir
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    // Criar diretórios para cada tamanho
    Object.keys(imageSizes).forEach(size => {
        const sizeDir = path.join(baseDir, size);
        if (!fs.existsSync(sizeDir)) {
            fs.mkdirSync(sizeDir);
        }
    });
}

/**
 * Processa uma imagem, criando múltiplos tamanhos e formatos
 * @param {string} inputPath - Caminho da imagem original
 * @param {string} filename - Nome do arquivo sem extensão
 * @returns {Promise<object>} - Metadados da imagem processada
 */
async function processImage(inputPath, filename) {
    try {
        ensureDirectoriesExist();

        // Carregar imagem com sharp
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Guardar informações da imagem original
        const original = {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: (await fs.promises.stat(inputPath)).size
        };

        // Resultado com os caminhos das imagens processadas
        const variants = {};

        // Processar cada tamanho
        for (const [sizeName, dimensions] of Object.entries(imageSizes)) {
            variants[sizeName] = {};

            // Calcular dimensões mantendo proporção
            const resizeOptions = {
                width: dimensions.width,
                height: dimensions.height,
                fit: 'inside',
                withoutEnlargement: true
            };

            // Processar cada formato
            for (const [format, options] of Object.entries(formatConfig)) {
                const outputPath = path.join('uploads', 'imagens', sizeName, `${filename}.${format}`);

                await image
                    .clone()
                    .resize(resizeOptions)
                [format](options)
                    .toFile(outputPath);

                // Guardar caminho relativo e informações
                const fileStats = await fs.promises.stat(outputPath);
                variants[sizeName][format] = {
                    path: `/uploads/imagens/${sizeName}/${filename}.${format}`,
                    size: fileStats.size
                };
            }
        }

        return {
            filename,
            original,
            variants
        };
    } catch (error) {
        console.error('Erro ao processar imagem:', error);
        throw error;
    }
}

/**
 * Exclui todas as variantes de uma imagem
 * @param {string} filename - Nome do arquivo sem extensão
 */
async function deleteImageVariants(filename) {
    try {
        // Excluir para cada tamanho e formato
        for (const size of Object.keys(imageSizes)) {
            for (const format of Object.keys(formatConfig)) {
                const filePath = path.join('uploads', 'imagens', size, `${filename}.${format}`);
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                }
            }
        }
    } catch (error) {
        console.error('Erro ao excluir variantes de imagem:', error);
        throw error;
    }
}

module.exports = {
    processImage,
    deleteImageVariants,
    imageSizes,
    formatConfig
}; 