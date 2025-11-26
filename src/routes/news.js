const express = require('express');
const router = express.Router();
const {
    getAllNews,
    getNewsById,
    createNews,
    updateNews,
    deleteNews,
    reviewNews,
    getMyNews,
    getNewsForModeration
} = require('../controllers/newsController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Rutas públicas
router.get('/', getAllNews);
router.get('/:id', getNewsById);

// Rutas protegidas para usuarios registrados
router.get('/my/news', authenticateToken, getMyNews);

// Rutas para periodistas
router.post('/', authenticateToken, authorize(['journalist', 'moderator', 'admin']), createNews);
router.put('/:id', authenticateToken, updateNews); // El controlador verifica permisos
router.delete('/:id', authenticateToken, deleteNews); // El controlador verifica permisos

// Rutas para moderadores
router.get('/moderation/queue', authenticateToken, authorize(['moderator', 'admin']), getNewsForModeration);
router.patch('/:id/review', authenticateToken, authorize(['moderator', 'admin']), reviewNews);

module.exports = router;