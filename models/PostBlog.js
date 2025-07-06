const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const PostBlog = sequelize.define(
  "PostBlog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    conteudo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    autorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    publicadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("rascunho", "publicado"),
      defaultValue: "rascunho",
    },
    imagemDestaque: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "posts_blog",
    timestamps: true,
  },
)

module.exports = PostBlog
