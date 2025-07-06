const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processImage } = require("../utils/imageProcessor");

// Função para excluir arquivos com tentativas repetidas
const safeUnlink = (filePath, maxRetries = 5, retryDelay = 2000) => {
    let attempts = 0;
    
    const attemptDelete = () => {
        attempts++;
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Arquivo temporário excluído com sucesso: ${filePath}`);
                return true;
            }
            return true; // Arquivo já não existe, consideramos sucesso
        } catch (err) {
            if (err.code === 'EBUSY' && attempts < maxRetries) {
                console.log(`Tentativa ${attempts}/${maxRetries} falhou. Arquivo ocupado: ${filePath}. Tentando novamente em ${retryDelay}ms...`);
                setTimeout(attemptDelete, retryDelay);
                return false;
            } else {
                console.warn(`Não foi possível excluir o arquivo temporário ${filePath} após ${attempts} tentativas:`, err.message);
                return false;
            }
        }
    };
    
    return attemptDelete();
};

// Criar diretórios de upload se não existirem
const ensureDirectoriesExist = () => {
    const dirs = [
        "uploads",
        "uploads/temp",
        "uploads/imagens",
        "uploads/arquivos",
        "uploads/videos"
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

// Garantir que os diretórios existam
ensureDirectoriesExist();

// Configuração de armazenamento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Salvar temporariamente em uploads/temp
        cb(null, "uploads/temp");
    },
    filename: (req, file, cb) => {
        // Gerar nome único com timestamp + número aleatório + extensão original
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        const ext = path.extname(file.originalname);
        const filename = `${timestamp}-${randomNum}${ext}`;
        cb(null, filename);
    }
});

// Filtro para aceitar apenas imagens
const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Tipo de arquivo não suportado. Apenas imagens são permitidas."), false);
    }
};

// Filtro para arquivos de produto (imagens, PDFs, ZIPs)
const productFileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/zip",
        "application/x-zip-compressed",
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Tipo de arquivo não suportado."), false);
    }
};

// Filtro específico para vídeos
const videoFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Tipo de arquivo não suportado. Apenas vídeos são permitidos."), false);
    }
};

// Configuração do multer para upload de imagens
const uploadImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Configuração do multer para upload de arquivos de produto
const uploadProductFile = multer({
    storage,
    fileFilter: productFileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

// Configuração do multer para upload de vídeos
const uploadVideo = multer({
    storage,
    fileFilter: videoFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

/**
 * Middleware para processar uma única imagem após upload
 */
const processUploadedImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        // Processar a imagem
        const processedImage = await processImage(
            req.file.path,
            path.parse(req.file.filename).name
        );

        // Adicionar informações processadas ao request
        req.processedImage = processedImage;

        // Remover arquivo temporário com um pequeno delay para evitar EBUSY no Windows
        setTimeout(() => {
            safeUnlink(req.file.path);
        }, 3000); // Aumentado para 3 segundos

        next();
    } catch (error) {
        // Limpar arquivo temporário em caso de erro, com delay
        setTimeout(() => {
            safeUnlink(req.file.path);
        }, 3000);

        next(error);
    }
};

/**
 * Middleware para processar múltiplas imagens após upload
 */
const processUploadedImages = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        const processedImages = [];

        // Processar cada imagem
        for (const file of req.files) {
            const processedImage = await processImage(
                file.path,
                path.parse(file.filename).name
            );

            processedImages.push(processedImage);

            // Remover arquivo temporário com um pequeno delay para evitar EBUSY no Windows
            setTimeout(() => {
                safeUnlink(file.path);
            }, 3000); // Aumentado para 3 segundos
        }

        // Adicionar informações processadas ao request
        req.processedImages = processedImages;

        next();
    } catch (error) {
        // Limpar arquivos temporários em caso de erro, com delay
        if (req.files) {
            req.files.forEach(file => {
                setTimeout(() => {
                    safeUnlink(file.path);
                }, 3000);
            });
        }

        next(error);
    }
};

// Funções auxiliares para uso direto
const singleUpload = (fieldName = "imagem") => {
    return [
        uploadImage.single(fieldName),
        processUploadedImage
    ];
};

const multipleUpload = (fieldName = "imagens", maxCount = 10) => {
    return [
        uploadImage.array(fieldName, maxCount),
        processUploadedImages
    ];
};

const productFileUpload = (fieldName = "arquivo") => {
    return uploadProductFile.single(fieldName);
};

module.exports = {
    uploadImage,
    uploadProductFile,
    uploadVideo,
    processUploadedImage,
    processUploadedImages,
    singleUpload,
    multipleUpload,
    productFileUpload
}; 