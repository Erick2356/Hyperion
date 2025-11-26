const express = require('express');
const router = express.Router();
const {
    createComment,
    getNewsComments,
    updateComment,
    deleteComment,
    reactToComment,
    moderateComment,
    getCommentsForModeration,
    getMyComments
} = require('../controllers/commentController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Rutas públicas
router.get('/news/:newsId', getNewsComments);

// Rutas para usuarios registrados
router.post('/', authenticateToken, authorize(['registered_user', 'journalist', 'moderator', 'admin']), createComment);
router.put('/:id', authenticateToken, updateComment); // El controlador verifica que sea el autor
router.delete('/:id', authenticateToken, deleteComment); // El controlador verifica permisos
router.post('/:id/react', authenticateToken, authorize(['registered_user', 'journalist', 'moderator', 'admin']), reactToComment);

// Rutas para el usuario autenticado
router.get('/my/comments', authenticateToken, getMyComments);

// Rutas para moderadores
router.get('/moderation/queue', authenticateToken, authorize(['moderator', 'admin']), getCommentsForModeration);
router.patch('/:id/moderate', authenticateToken, authorize(['moderator', 'admin']), moderateComment);

module.exports = router;