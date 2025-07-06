const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Usuario = require('./Usuario');
const PlanoAssinatura = require('./PlanoAssinatura');
const EnderecoUsuario = require('./EnderecoUsuario');

const AssinaturaUsuario = sequelize.define(
  'AssinaturaUsuario',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mercadoPagoSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('ativa', 'pausada', 'cancelada', 'inadimplente'),
      allowNull: false,
    },
    dataProximoCobranca: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    planoId: {
      type: DataTypes.UUID,
      allowNull: true,   //  <-- TEM que ser true
    },
    valorFrete: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    metodoFrete: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'assinaturas_usuario',
    timestamps: true,
  },
)

// AssinaturaUsuario.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
// AssinaturaUsuario.belongsTo(PlanoAssinatura, { foreignKey: 'planoId', as: 'plano' });
// AssinaturaUsuario.belongsTo(EnderecoUsuario, { foreignKey: 'enderecoEntregaId', as: 'enderecoEntrega' });

module.exports = AssinaturaUsuario;