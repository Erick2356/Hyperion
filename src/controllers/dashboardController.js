const News = require('../models/news');
const User = require('../models/user');
const Comment = require('../models/comment');

// Estadísticas generales del sistema (admin/moderadores)
const getSystemStats = async (req, res) => {
    try {
        // Obtener conteos en paralelo para mejor performance
        const [
            totalNews,
            publishedNews,
            pendingNews,
            totalUsers,
            journalists,
            moderators,
            totalComments,
            pendingComments,
            todayNews,
            todayComments
        ] = await Promise.all([
            // Noticias
            News.countDocuments(),
            News.countDocuments({ status: 'approved' }),
            News.countDocuments({ status: 'pending_review' }),

            // Usuarios
            User.countDocuments(),
            User.countDocuments({ role: 'journalist' }),
            User.countDocuments({ role: 'moderator' }),

            // Comentarios
            Comment.countDocuments(),
            Comment.countDocuments({ status: 'pending' }),

            // Actividad hoy
            News.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }),
            Comment.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            })
        ]);

        // Noticias por categoría
        const newsByCategory = await News.aggregate([
            {
                $match: {
                    status: 'approved',
                    category: { $exists: true, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Noticias por estado
        const newsByStatus = await News.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Comentarios por estado
        const commentsByStatus = await Comment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Actividad reciente (últimos 7 días)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        const recentActivity = await Promise.all(
            last7Days.map(async (date) => {
                const startDate = new Date(date);
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 1);

                const [newsCount, commentsCount] = await Promise.all([
                    News.countDocuments({
                        createdAt: { $gte: startDate, $lt: endDate }
                    }),
                    Comment.countDocuments({
                        createdAt: { $gte: startDate, $lt: endDate }
                    })
                ]);

                return {
                    date,
                    news: newsCount,
                    comments: commentsCount
                };
            })
        );

        // Top periodistas por noticias publicadas
        const topJournalists = await News.aggregate([
            { $match: { status: 'approved' } },
            {
                $group: {
                    _id: '$author',
                    newsCount: { $sum: 1 },
                    totalViews: { $sum: '$viewCount' }
                }
            },
            { $sort: { newsCount: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },
            {
                $project: {
                    authorName: { $arrayElemAt: ['$authorInfo.name', 0] },
                    authorEmail: { $arrayElemAt: ['$authorInfo.email', 0] },
                    newsCount: 1,
                    totalViews: 1
                }
            }
        ]);

        // Noticias más populares
        const popularNews = await News.find({ status: 'approved' })
            .sort({ viewCount: -1 })
            .limit(5)
            .populate('author', 'name email')
            .select('title viewCount createdAt category');

        res.json({
            success: true,
            data: {
                overview: {
                    totalNews,
                    publishedNews,
                    pendingNews,
                    totalUsers,
                    journalists,
                    moderators,
                    totalComments,
                    pendingComments,
                    todayNews,
                    todayComments
                },
                charts: {
                    newsByCategory,
                    newsByStatus,
                    commentsByStatus
                },
                recentActivity,
                topJournalists,
                popularNews,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del sistema',
            error: error.message
        });
    }
};

// Estadísticas para periodistas
const getJournalistStats = async (req, res) => {
    try {
        const journalistId = req.user.id;

        const [
            totalNews,
            publishedNews,
            pendingNews,
            rejectedNews,
            draftNews,
            totalComments,
            totalViews
        ] = await Promise.all([
            News.countDocuments({ author: journalistId }),
            News.countDocuments({ author: journalistId, status: 'approved' }),
            News.countDocuments({ author: journalistId, status: 'pending_review' }),
            News.countDocuments({ author: journalistId, status: 'rejected' }),
            News.countDocuments({ author: journalistId, status: 'draft' }),

            // Comentarios en noticias del periodista
            Comment.countDocuments({
                news: {
                    $in: await News.find({ author: journalistId }).distinct('_id')
                },
                status: 'approved'
            }),

            // Total de vistas
            News.aggregate([
                { $match: { author: journalistId } },
                { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
            ])
        ]);

        // Noticias por categoría del periodista
        const newsByCategory = await News.aggregate([
            {
                $match: {
                    author: journalistId,
                    category: { $exists: true, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Noticias recientes del periodista
        const recentNews = await News.find({ author: journalistId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('reviewedBy', 'name email')
            .select('title status viewCount createdAt reviewedBy');

        // Actividad mensual
        const monthlyActivity = await News.aggregate([
            { $match: { author: journalistId } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    newsCount: { $sum: 1 },
                    avgViews: { $avg: '$viewCount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalNews,
                    publishedNews,
                    pendingNews,
                    rejectedNews,
                    draftNews,
                    totalComments,
                    totalViews: totalViews[0]?.totalViews || 0
                },
                newsByCategory,
                recentNews,
                monthlyActivity,
                performance: {
                    approvalRate: totalNews > 0 ? (publishedNews / totalNews * 100).toFixed(1) : 0,
                    avgViewsPerNews: totalNews > 0 ? Math.round((totalViews[0]?.totalViews || 0) / totalNews) : 0
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del periodista',
            error: error.message
        });
    }
};

// Estadísticas para moderadores
const getModeratorStats = async (req, res) => {
    try {
        const [
            pendingNews,
            pendingComments,
            moderatedThisWeek,
            avgModerationTime
        ] = await Promise.all([
            News.countDocuments({ status: 'pending_review' }),
            Comment.countDocuments({ status: 'pending' }),

            // Conteo de moderaciones esta semana
            News.countDocuments({
                reviewedBy: req.user.id,
                updatedAt: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
            }),

            // Tiempo promedio de moderación (en horas)
            News.aggregate([
                {
                    $match: {
                        reviewedBy: { $exists: true },
                        status: { $in: ['approved', 'rejected'] }
                    }
                },
                {
                    $project: {
                        moderationTime: {
                            $divide: [
                                { $subtract: ['$updatedAt', '$createdAt'] },
                                3600000 // milisegundos a horas
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: '$moderationTime' }
                    }
                }
            ])
        ]);

        // Distribución de decisiones de moderación
        const moderationDecisions = await News.aggregate([
            {
                $match: {
                    reviewedBy: req.user.id,
                    status: { $in: ['approved', 'rejected'] }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Actividad reciente de moderación
        const recentModerations = await News.find({ reviewedBy: req.user.id })
            .sort({ updatedAt: -1 })
            .limit(10)
            .populate('author', 'name email')
            .select('title status reviewComments updatedAt author');

        res.json({
            success: true,
            data: {
                pendingItems: {
                    news: pendingNews,
                    comments: pendingComments,
                    total: pendingNews + pendingComments
                },
                moderationStats: {
                    moderatedThisWeek,
                    approvalRate: moderationDecisions.find(d => d._id === 'approved')?.count || 0,
                    rejectionRate: moderationDecisions.find(d => d._id === 'rejected')?.count || 0,
                    avgModerationTime: avgModerationTime[0]?.avgTime ? avgModerationTime[0].avgTime.toFixed(1) : 0
                },
                recentModerations,
                efficiency: {
                    itemsPerDay: moderatedThisWeek > 0 ? (moderatedThisWeek / 7).toFixed(1) : 0
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del moderador',
            error: error.message
        });
    }
};

// Estadísticas básicas para usuarios registrados
const getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const [
            commentsCount,
            approvedComments,
            likesReceived,
            userComments
        ] = await Promise.all([
            Comment.countDocuments({ author: userId }),
            Comment.countDocuments({ author: userId, status: 'approved' }),

            // Likes recibidos en comentarios
            Comment.aggregate([
                { $match: { author: userId } },
                { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
            ]),

            // Comentarios recientes
            Comment.find({ author: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('news', 'title')
                .select('content status likes dislikes createdAt news')
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalComments: commentsCount,
                    approvedComments,
                    pendingComments: commentsCount - approvedComments,
                    likesReceived: likesReceived[0]?.totalLikes || 0,
                    approvalRate: commentsCount > 0 ? (approvedComments / commentsCount * 100).toFixed(1) : 0
                },
                recentComments: userComments,
                activity: {
                    commentsThisWeek: await Comment.countDocuments({
                        author: userId,
                        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
                    })
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del usuario',
            error: error.message
        });
    }
};

module.exports = {
    getSystemStats,
    getJournalistStats,
    getModeratorStats,
    getUserStats
};s