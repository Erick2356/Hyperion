const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
 
router.get('/test', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: '✅ Dashboard funcionando',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// Ruta básica de estadísticas del sistema
router.get('/system', authenticateToken, authorize(['admin', 'moderator']), (req, res) => {
    res.json({
        success: true,
        message: 'Estadísticas del sistema - Por implementar',
        data: {
            totalUsers: 0,
            totalNews: 0,
            pendingModeration: 0
        }
    });
});

module.exports = router;