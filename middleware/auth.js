const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const config = require('../config/config');

/**
 * Middleware para verificar token JWT
 */
const verifyToken = async (req, res, next) => {
    try {
        // Pegar o token do header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ erro: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];

        // Verificar token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Buscar usuário
        const usuario = await Usuario.findByPk(decoded.id);

        if (!usuario) {
            return res.status(401).json({ erro: 'Usuário não encontrado' });
        }

        // Adicionar usuário ao request – manter compatibilidade com controladores que usam `req.usuario`
        req.user = usuario
        req.usuario = usuario

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ erro: 'Token inválido ou expirado' });
        }

        next(error);
    }
};

/**
 * Middleware para verificar se o usuário é administrador
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }

    if (req.user.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso não autorizado' });
    }

    next();
};

module.exports = {
    verifyToken,
    isAdmin
}; 