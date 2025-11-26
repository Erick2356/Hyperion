const News = require('../models/news');

// Obtener todas las noticias (público - solo aprobadas)
const getAllNews = async (req, res) => {
    try {
        const {
            category,
            search,
            page = 1,
            limit = 10,
            sortBy = 'publishedAt',
            sortOrder = 'desc'
        } = req.query;

        // Construir filtro
        const filter = { status: 'approved' };

        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Opciones de paginación
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
            populate: {
                path: 'author',
                select: 'name email role'
            }
        };

        // Buscar noticias
        const news = await News.find(filter)
            .sort(options.sort)
            .limit(options.limit * 1)
            .skip((options.page - 1) * options.limit)
            .populate('author', 'name email role')
            .populate('reviewedBy', 'name email');

        const total = await News.countDocuments(filter);

        res.json({
            success: true,
            data: news,
            pagination: {
                currentPage: options.page,
                totalPages: Math.ceil(total / options.limit),
                totalItems: total,
                itemsPerPage: options.limit
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener noticias',
            error: error.message
        });
    }
};

// Obtener noticia por ID (público - solo aprobadas)
const getNewsById = async (req, res) => {
    try {
        const news = await News.findOne({
            _id: req.params.id,
            status: 'approved'
        })
            .populate('author', 'name email role profile')
            .populate('reviewedBy', 'name email');

        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        // Incrementar contador de vistas
        news.viewCount += 1;
        await news.save();

        res.json({
            success: true,
            data: news
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener noticia',
            error: error.message
        });
    }
};

// Crear nueva noticia (solo periodistas)
const createNews = async (req, res) => {
    try {
        const { title, content, summary, category, sources, images, tags, isBreakingNews } = req.body;

        const news = new News({
            title,
            content,
            summary,
            category,
            sources: sources || [],
            images: images || [],
            tags: tags || [],
            isBreakingNews: isBreakingNews || false,
            author: req.user.id,
            status: req.user.role === 'journalist' ? 'pending_review' : 'draft'
        });

        await news.save();
        await news.populate('author', 'name email role');

        res.status(201).json({
            success: true,
            message: 'Noticia creada exitosamente',
            data: news
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear noticia',
            error: error.message
        });
    }
};

// Actualizar noticia (autor o moderador)
const updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Buscar noticia
        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        // Verificar permisos: solo el autor o moderadores pueden editar
        if (news.author.toString() !== req.user.id &&
            !['moderator', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para editar esta noticia'
            });
        }

        // Si es el autor y cambia contenido, volver a estado de revisión
        if (news.author.toString() === req.user.id &&
            (updateData.title || updateData.content)) {
            updateData.status = 'pending_review';
        }

        const updatedNews = await News.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('author', 'name email role')
            .populate('reviewedBy', 'name email');

        res.json({
            success: true,
            message: 'Noticia actualizada exitosamente',
            data: updatedNews
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar noticia',
            error: error.message
        });
    }
};

// Eliminar noticia (autor o moderador)
const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        // Verificar permisos: solo el autor o moderadores/admin pueden eliminar
        if (news.author.toString() !== req.user.id &&
            !['moderator', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para eliminar esta noticia'
            });
        }

        await News.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Noticia eliminada exitosamente'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar noticia',
            error: error.message
        });
    }
};

// Aprobar/Rechazar noticia (solo moderadores)
const reviewNews = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewComments } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido. Use: approved o rejected'
            });
        }

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        const updatedNews = await News.findByIdAndUpdate(
            id,
            {
                status,
                reviewedBy: req.user.id,
                reviewComments,
                publishedAt: status === 'approved' ? new Date() : null
            },
            { new: true }
        ).populate('author', 'name email role')
            .populate('reviewedBy', 'name email');

        res.json({
            success: true,
            message: `Noticia ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`,
            data: updatedNews
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al revisar noticia',
            error: error.message
        });
    }
};

// Obtener noticias del usuario autenticado
const getMyNews = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const filter = { author: req.user.id };
        if (status) {
            filter.status = status;
        }

        const news = await News.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('reviewedBy', 'name email');

        const total = await News.countDocuments(filter);

        res.json({
            success: true,
            data: news,
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
            message: 'Error al obtener mis noticias',
            error: error.message
        });
    }
};

// Obtener noticias para moderación (solo moderadores)
const getNewsForModeration = async (req, res) => {
    try {
        const { status = 'pending_review', page = 1, limit = 10 } = req.query;

        const news = await News.find({ status })
            .sort({ createdAt: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('author', 'name email role')
            .populate('reviewedBy', 'name email');

        const total = await News.countDocuments({ status });

        res.json({
            success: true,
            data: news,
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
            message: 'Error al obtener noticias para moderación',
            error: error.message
        });
    }
};

module.exports = {
    getAllNews,
    getNewsById,
    createNews,
    updateNews,
    deleteNews,
    reviewNews,
    getMyNews,
    getNewsForModeration
};