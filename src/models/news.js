const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    Titular: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    Subtitulo: {
        type: String,
        required: false,
        unique: true,
        trim: true
    },
    Entrada: {
        type: String,
        required: true
    },
    Cuerpo: {
        type: String,
        required: true
    },
    Fuentes: {
        type: String,
        required: true
    },
    Imagenes: {
        type: String,
        required: true
    },
    Epigrafe: {
        type: String,
        required: true
    },
    Autor: {
        type: String,
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model('Noticia', newsSchema);