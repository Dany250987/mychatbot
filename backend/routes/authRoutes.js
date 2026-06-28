const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const connection = require('../db/connection');

// 👤 Registro clásico
router.post('/register', async (req, res) => {
  const { name, email, password, date_of_birth, phone_number } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('📥 Insertando usuario de Google:', name, email);

    const query = `INSERT INTO users 
      (name, email, password, date_of_birth, phone_number)
      VALUES (?, ?, ?, ?, ?)`;

    const values = [name, email, hashedPassword, date_of_birth, phone_number];

    connection.query(query, values, (err, results) => {
      if (err) {
        console.error('❌ Error al registrar:', err);
        return res.status(500).json({ error: 'Error al registrar el usuario' });
      }

      return res.status(201).json({ message: '✅ Usuario registrado exitosamente' });
    });

  } catch (error) {
    console.error('❌ Error al hashear la contraseña:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🔐 Registro/Login con Googles
router.post('/google-login', (req, res) => {
  const { name, email, picture } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: 'Faltan datos del usuario de Google'
    });
  }

  const checkQuery = 'SELECT * FROM users WHERE email = ?';

  connection.query(checkQuery, [email], (err, results) => {
    if (err) {
      console.error('❌ Error al buscar usuario:', err);

      return res.status(500).json({
        error: 'Error en el servidor'
      });
    }

    if (results.length > 0) {
      const user = results[0];

      return res.status(200).json({
        message: 'Bienvenido de nuevo',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture || picture || null
        }
      });
    }

    const insertQuery = `
      INSERT INTO users (name, email, picture)
      VALUES (?, ?, ?)
    `;

    connection.query(insertQuery, [name, email, picture || null], (err, result) => {
      if (err) {
        console.error('❌ Error al registrar usuario de Google:', err);

        return res.status(500).json({
          error: 'Error al registrar usuario de Google'
        });
      }

      return res.status(201).json({
        message: 'Usuario creado con Google',
        user: {
          id: result.insertId,
          name,
          email,
          picture: picture || null
        }
      });
    });
  });
});

// 🔐 Login clásico con email y contraseña
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Faltan email o contraseña'
    });
  }

  const query = 'SELECT * FROM users WHERE email = ?';

  connection.query(query, [email], async (err, results) => {
    if (err) {
      console.error('❌ Error al buscar usuario:', err);

      return res.status(500).json({
        error: 'Error del servidor'
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos'
      });
    }

    const user = results[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos'
      });
    }

    return res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture || null
      }
    });
  });
});

module.exports = router;
