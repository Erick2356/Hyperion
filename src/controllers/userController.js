const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registrar nuevo usuario
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya existe'
            });
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear nuevo usuario (solo permitir roles básicos en registro)
        const allowedRoles = ['reader', 'registered_user'];
        const userRole = allowedRoles.includes(role) ? role : 'reader';

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: userRole
        });

        await newUser.save();

        // Generar token JWT
        const token = jwt.sign(
            {
                id: newUser._id,
                role: newUser.role,
                email: newUser.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                },
                token
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario',
            error: error.message
        });
    }
};

// Login de usuario
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verificar si el usuario existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar si el usuario está activo
        if (!user.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Usuario inactivo'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error en el login',
            error: error.message
        });
    }
};

// Obtener perfil de usuario
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil',
            error: error.message
        });
    }
};

// Actualizar perfil de usuario
const updateUserProfile = async (req, res) => {
    try {
        const { name, bio, avatar, specialization } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                name,
                'profile.bio': bio,
                'profile.avatar': avatar,
                'profile.specialization': specialization
            },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: updatedUser
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar perfil',
            error: error.message
        });
    }
};

// Obtener todos los usuarios (solo admin/moderador)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
};

// Actualizar rol de usuario (solo admin)
const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const allowedRoles = ['reader', 'registered_user', 'journalist', 'moderator', 'admin'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol no válido'
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Rol actualizado exitosamente',
            data: updatedUser
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar rol',
            error: error.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    updateUserRole
};