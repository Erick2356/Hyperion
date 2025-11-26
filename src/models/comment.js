const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'El contenido del comentario es obligatorio'],
        trim: true,
        maxlength: 1000
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    news: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'News',
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending'
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Campos para moderación
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderationReason: {
        type: String,
        enum: ['spam', 'inappropriate', 'off_topic', 'harassment', 'false_info', 'other'],
        default: 'other'
    },
    moderationNotes: String,
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now
        }
    }],
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
commentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Guardar historial de ediciones
    if (this.isModified('content') && !this.isNew) {
        this.isEdited = true;
        this.editHistory.push({
            content: this.previous('content'),
            editedAt: new Date()
        });
    }

    next();
});

// Índices para mejor performance
commentSchema.index({ news: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ status: 1 });
commentSchema.index({ parentComment: 1 });

// Método para obtener cantidad de respuestas
commentSchema.virtual('replyCount', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentComment',
    count: true
});

// Asegurar que los virtuals se incluyan en JSON
commentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Comment', commentSchema);