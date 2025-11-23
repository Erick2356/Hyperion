const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

// Hash de contraseña antes de guardar
usuarioSchema.pre('save', async function (next) {
    if (!this.isModified('contraseña')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.contraseña = await bcrypt.hash(this.contraseña, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas
usuarioSchema.methods.compararContraseña = async function (contraseñaIngresada) {
    return await bcrypt.compare(contraseñaIngresada, this.contraseña);
};

module.exports = mongoose.model('Usuario', usuarioSchema);