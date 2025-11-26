const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    updateUserRole
} = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Rutas públicas
router.post('/register', registerUser);
router.post('/login', loginUser);

// Rutas protegidas
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);

// Rutas de administración
router.get('/', authenticateToken, authorize(['admin', 'moderator']), getAllUsers);
router.put('/:userId/role', authenticateToken, authorize(['admin']), updateUserRole);

module.exports = router;