const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'El título es obligatorio'],
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: [true, 'El contenido es obligatorio'],
        trim: true
    },
    summary: {
        type: String,
        trim: true,
        maxlength: 300
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['política', 'salud', 'tecnología', 'deportes', 'economía', 'cultura', 'internacional', 'otros'],
        default: 'otros'
    },
    sources: [{
        name: String,
        url: String
    }],
    images: [{
        url: String,
        caption: String
    }],
    status: {
        type: String,
        enum: ['draft', 'pending_review', 'approved', 'rejected', 'published'],
        default: 'draft'
    },
    isBreakingNews: {
        type: Boolean,
        default: false
    },
    tags: [String],
    viewCount: {
        type: Number,
        default: 0
    },
    // Campos para moderación
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewComments: String,
    publishedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Actualizar fecha de modificación
newsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Si se aprueba la noticia, establecer fecha de publicación
    if (this.status === 'approved' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    next();
});

// Índices para mejor performance
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ category: 1 });
newsSchema.index({ author: 1 });

module.exports = mongoose.model('News', newsSchema);