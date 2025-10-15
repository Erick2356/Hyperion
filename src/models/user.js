const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    contraseña: {
        type: String,
        required: true
    },
    fecha_registro: {
        type: Date,
        default: Date.now
    },
    rol: {
        type: String,
        enum: ['lector', 'usuario', 'periodista', 'moderador'],
        default: 'lector'
    }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
