const express = require("express");
const mongoose = require('mongoose');
const cors = require("cors"); // ← Importar CORS
require("dotenv").config();
const userRoutes = require("./routes/user");
const newsRoutes = require("./routes/news");
const JournalistRoutes = require("./routes/journalist");

const app = express();
const port = process.env.PORT || 9000;

// Middleware CORS completo
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api', userRoutes);
app.use('/api', newsRoutes);
app.use('/api/journalists', JournalistRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: "API Hyperion funcionando" });
});

// Ruta de prueba específica para usuarios
app.get('/api/test', (req, res) => {
    res.json({ message: "Ruta de prueba funcionando" });
});

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch((error) => console.error("❌ MongoDB error:", error));

app.listen(port, () => console.log("🚀 Server listening on port", port));