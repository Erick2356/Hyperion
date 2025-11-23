const express = require("express");
const userSchema = require("../models/user");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Ruta de LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, contraseña } = req.body;

        // 1. Validar que vengan los datos
        if (!email || !contraseña) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // 2. Buscar usuario
        const usuario = await userSchema.findOne({ email: email.toLowerCase() });
        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // 3. Verificar contraseña
        const esContraseñaValida = await usuario.compararContraseña(contraseña);
        if (!esContraseñaValida) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // 4. Generar token JWT
        const token = jwt.sign(
            {
                usuarioId: usuario._id,
                email: usuario.email,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 5. Responder con éxito
        res.json({
            success: true,
            message: 'Login exitoso',
            token: token,
            usuario: {
                id: usuario._id,
                email: usuario.email,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// CREATE user (REGISTRO)
router.post('/users', async (req, res) => {
    try {
        console.log('🎯 REGISTRO INICIADO - Body recibido:', JSON.stringify(req.body, null, 2));

        const { nombre, email, contraseña, rol } = req.body;

        // Validar que los datos lleguen correctamente
        if (!nombre || !email || !contraseña) {
            console.log('❌ DATOS FALTANTES - nombre:', !!nombre, 'email:', !!email, 'contraseña:', !!contraseña);
            return res.status(400).json({
                success: false,
                message: 'Nombre, email y contraseña son requeridos'
            });
        }

        console.log('🔍 Buscando usuario con email:', email);
        const usuarioExistente = await userSchema.findOne({ email: email.toLowerCase() });

        if (usuarioExistente) {
            console.log('❌ USUARIO EXISTENTE encontrado:', usuarioExistente.email);
            return res.status(400).json({
                success: false,
                message: 'El usuario ya existe'
            });
        }

        console.log('👤 Creando nuevo usuario...');
        const usuario = new userSchema({
            nombre,
            email: email.toLowerCase(),
            contraseña,
            rol: rol || 'lector'
        });

        console.log('💾 Intentando guardar usuario...');
        const data = await usuario.save();
        console.log('✅ USUARIO GUARDADO EXITOSAMENTE - ID:', data._id);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            usuario: {
                id: data._id,
                nombre: data.nombre,
                email: data.email,
                rol: data.rol
            }
        });

    } catch (error) {
        console.error('💥 ERROR CRÍTICO EN REGISTRO:', error.message);
        console.error('💥 Stack completo:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error del servidor: ' + error.message
        });
    }
});
// GET all users
router.get('/users', (req, res) => {
    userSchema.find()
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// GET a user
router.get('/users/:id', (req, res) => {
    const { id } = req.params;
    userSchema.findById(id)
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// UPDATE user
router.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, email, contraseña, rol } = req.body;
    userSchema.updateOne({ _id: id }, { $set: { nombre, email, contraseña, rol } })
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// DELETE user
router.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    userSchema.deleteOne({ _id: id })
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

module.exports = router;