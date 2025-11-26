const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acceso requerido'
            });
        }

        // Verificar token con el mismo secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuario en la base de datos
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no válido o inactivo'
            });
        }

        // Agregar usuario al request
        req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        console.error('Error verifying token:', error.message);

        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Token inválido'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token expirado'
            });
        }

        return res.status(403).json({
            success: false,
            message: 'Error al verificar token'
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