const express = require('express');
const path = require('path');
const authRoutes = require('./routes/authRoutes'); // ← también debe ir después de express
const app = express(); // ← PRIMERO crear la app

// Middleware
app.use(express.json()); // Para leer JSON en el body
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public'))); // si public está fuera de backend

// Rutas API
app.use('/api/auth', authRoutes);

// Ruta para cargar el HTML principal (opcional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/signup.html')); // o el archivo que prefieras como home
});

// Escuchar puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
