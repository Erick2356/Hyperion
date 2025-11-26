const Comment = require('../models/comment');
const News = require('../models/news');

// Crear nuevo comentario (usuarios registrados)
const createComment = async (req, res) => {
    try {
        const { content, newsId, parentCommentId } = req.body;

        // Verificar que la noticia existe y está aprobada
        const news = await News.findOne({ _id: newsId, status: 'approved' });
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada o no aprobada'
            });
        }

        // Verificar comentario padre si se proporciona
        if (parentCommentId) {
            const parentComment = await Comment.findOne({
                _id: parentCommentId,
                news: newsId,
                status: 'approved'
            });
            if (!parentComment) {
                return res.status(404).json({
                    success: false,
                    message: 'Comentario padre no encontrado'
                });
            }
        }

        // Crear comentario
        const comment = new Comment({
            content,
            author: req.user.id,
            news: newsId,
            parentComment: parentCommentId || null,
            status: req.user.role === 'registered_user' ? 'pending' : 'approved'
        });

        await comment.save();
        await comment.populate('author', 'name email role profile');

        res.status(201).json({
            success: true,
            message: 'Comentario creado exitosamente. ' +
                (comment.status === 'pending' ? 'En espera de moderación.' : 'Comentario publicado.'),
            data: comment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear comentario',
            error: error.message
        });
    }
};

// Obtener comentarios de una noticia (público - solo aprobados)
const getNewsComments = async (req, res) => {
    try {
        const { newsId } = req.params;
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Verificar que la noticia existe
        const news = await News.findById(newsId);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        // Construir filtro para comentarios aprobados
        const filter = {
            news: newsId,
            status: 'approved',
            parentComment: null // Solo comentarios principales
        };

        const comments = await Comment.find(filter)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('author', 'name email role profile')
            .populate({
                path: 'replyCount',
                match: { status: 'approved' }
            });

        // Obtener respuestas para cada comentario principal
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replies = await Comment.find({
                    parentComment: comment._id,
                    status: 'approved'
                })
                    .populate('author', 'name email role profile')
                    .sort({ createdAt: 1 })
                    .limit(10); // Máximo 10 respuestas por comentario

                return {
                    ...comment.toObject(),
                    replies
                };
            })
        );

        const total = await Comment.countDocuments(filter);

        res.json({
            success: true,
            data: commentsWithReplies,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener comentarios',
            error: error.message
        });
    }
};

// Editar comentario (solo el autor)
const updateComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        // Verificar que el usuario es el autor
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Solo el autor puede editar el comentario'
            });
        }

        // No permitir editar si ya fue moderado
        if (comment.status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'No se puede editar un comentario rechazado'
            });
        }

        comment.content = content;

        // Si era un comentario aprobado, volver a pendiente de moderación
        if (comment.status === 'approved') {
            comment.status = 'pending';
        }

        await comment.save();
        await comment.populate('author', 'name email role profile');

        res.json({
            success: true,
            message: 'Comentario actualizado exitosamente. En espera de nueva moderación.',
            data: comment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar comentario',
            error: error.message
        });
    }
};

// Eliminar comentario (autor o moderador)
const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        // Verificar permisos: autor o moderador/admin
        if (comment.author.toString() !== req.user.id &&
            !['moderator', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para eliminar este comentario'
            });
        }

        // Si es moderador, marcar como rechazado en lugar de eliminar
        if (['moderator', 'admin'].includes(req.user.role) &&
            comment.author.toString() !== req.user.id) {

            comment.status = 'rejected';
            comment.moderatedBy = req.user.id;
            comment.moderationReason = req.body.reason || 'other';
            comment.moderationNotes = req.body.notes || '';

            await comment.save();

            return res.json({
                success: true,
                message: 'Comentario rechazado exitosamente'
            });
        }

        // Si es el autor, eliminar completamente
        await Comment.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Comentario eliminado exitosamente'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar comentario',
            error: error.message
        });
    }
};

// Like/Dislike comentario (usuarios registrados)
const reactToComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reaction } = req.body; // 'like' or 'dislike'

        if (!['like', 'dislike'].includes(reaction)) {
            return res.status(400).json({
                success: false,
                message: 'Reacción no válida. Use: like o dislike'
            });
        }

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        const userId = req.user.id;
        const likesArray = comment.likes.map(id => id.toString());
        const dislikesArray = comment.dislikes.map(id => id.toString());

        if (reaction === 'like') {
            // Si ya dio like, quitarlo
            if (likesArray.includes(userId)) {
                comment.likes.pull(userId);
            } else {
                comment.likes.push(userId);
                // Quitar dislike si existía
                if (dislikesArray.includes(userId)) {
                    comment.dislikes.pull(userId);
                }
            }
        } else { // dislike
            // Si ya dio dislike, quitarlo
            if (dislikesArray.includes(userId)) {
                comment.dislikes.pull(userId);
            } else {
                comment.dislikes.push(userId);
                // Quitar like si existía
                if (likesArray.includes(userId)) {
                    comment.likes.pull(userId);
                }
            }
        }

        await comment.save();

        res.json({
            success: true,
            message: `Reacción ${reaction} actualizada`,
            data: {
                likes: comment.likes.length,
                dislikes: comment.dislikes.length,
                userReaction: reaction
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al reaccionar al comentario',
            error: error.message
        });
    }
};

// Moderar comentarios (solo moderadores)
const moderateComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, moderationReason, moderationNotes } = req.body;

        if (!['approved', 'rejected', 'flagged'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido. Use: approved, rejected o flagged'
            });
        }

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        comment.status = status;
        comment.moderatedBy = req.user.id;
        comment.moderationReason = moderationReason || 'other';
        comment.moderationNotes = moderationNotes || '';

        await comment.save();
        await comment.populate('author', 'name email role')
            .populate('moderatedBy', 'name email');

        res.json({
            success: true,
            message: `Comentario ${status === 'approved' ? 'aprobado' :
                status === 'rejected' ? 'rechazado' : 'marcado'} exitosamente`,
            data: comment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al moderar comentario',
            error: error.message
        });
    }
};

// Obtener comentarios para moderación (solo moderadores)
const getCommentsForModeration = async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;

        const comments = await Comment.find({ status })
            .sort({ createdAt: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('author', 'name email role')
            .populate('news', 'title')
            .populate('moderatedBy', 'name email');

        const total = await Comment.countDocuments({ status });

        res.json({
            success: true,
            data: comments,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener comentarios para moderación',
            error: error.message
        });
    }
};

// Obtener comentarios del usuario autenticado
const getMyComments = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const filter = { author: req.user.id };
        if (status) {
            filter.status = status;
        }

        const comments = await Comment.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('news', 'title')
            .populate('moderatedBy', 'name email');

        const total = await Comment.countDocuments(filter);

        res.json({
            success: true,
            data: comments,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener mis comentarios',
            error: error.message
        });
    }
};

module.exports = {
    createComment,
    getNewsComments,
    updateComment,
    deleteComment,
    reactToComment,
    moderateComment,
    getCommentsForModeration,
    getMyComments
};