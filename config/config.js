// config/config.js

require("dotenv").config() // ESTA LINHA É CRUCIAL E DEVE ESTAR NO TOPO DESTE ARQUIVO

const dbConfig = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT) || 3306,
    };

module.exports = {
  development: {
    ...dbConfig,
    dialect: "mysql",
    dialectOptions: { ssl: false },
    logging: console.log,
  },
  test: {
    ...dbConfig,
    dialect: "mysql",
    dialectOptions: { ssl: false },
    logging: false,
  },
  production: {
    ...dbConfig,
    dialect: "mysql",
    dialectOptions: { ssl: { require: false, rejectUnauthorized: false } },
    logging: false,
  },
  jwtSecret: process.env.JWT_SECRET || 'sua_chave_secreta', // Chave secreta para JWT
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h', // Tempo de expiração padrão para tokens JWT

  upload: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedFileTypes: ['application/pdf', 'application/zip', 'application/x-zip-compressed'],
    basePath: 'uploads',
    tempDir: 'uploads/temp',
    imageDir: 'uploads/imagens',
    fileDir: 'uploads/arquivos'
  },

  imageProcessing: {
    formats: {
      avif: { quality: 40 },
      webp: { quality: 55 }
    },
    sizes: {
      small: { width: 320, height: 320 },
      medium: { width: 640, height: 640 },
      large: { width: 1280, height: 1280 }
    }
  }
}