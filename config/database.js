const { Sequelize } = require("sequelize")
require("dotenv").config()

// Pool sizing: max=20 suporta ~50 compradores simultâneos confortavelmente.
// acquire=60000 evita timeout prematuro em picos de carga.
const POOL = { max: 20, min: 2, acquire: 60000, idle: 10000 };

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "mysql",
      logging: false,
      pool: POOL,
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        dialect: "mysql",
        logging: false,
        pool: POOL,
        dialectOptions: { ssl: false },
      }
    )

module.exports = { sequelize }
