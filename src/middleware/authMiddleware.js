const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acceso requerido'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

        // Buscar usuario en la base de datos
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no válido o inactivo'
            });
        }

        // Agregar usuario al request
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

// Middleware para verificar roles
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        // Si roles es un string, convertirlo a array
        if (typeof roles === 'string') {
            roles = [roles];
        }

        // Verificar si el usuario tiene alguno de los roles requeridos
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Permisos insuficientes. Se requiere uno de estos roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

module.exports = { authenticateToken, authorize };