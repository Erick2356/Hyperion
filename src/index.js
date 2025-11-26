require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hyperion', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Importar rutas
const userRoutes = require('./routes/user');
const newsRoutes = require('./routes/news');
const journalistRoutes = require('./routes/journalist');
const commentRoutes = require('./routes/comment');
const dashboardRoutes = require('./routes/dashboard');

// Usar rutas
app.use('/api/users', userRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/journalists', journalistRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Ruta de prueba básica
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: '✅ API HyperNews funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});
//Solo para los comentarios 
app.get('/api/comments/test', (req, res) => {
    res.json({
        success: true,
        message: '✅ Ruta de comentarios funcionando',
        timestamp: new Date().toISOString()
    });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.originalUrl}`
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});