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

// 🔐 Registro/Login con Google
router.post('/google-login', (req, res) => {
  console.log('📩 Llamada recibida en /google-login');
  console.log('🧠 Cuerpo recibido:', req.body);

  const { name, email, picture } = req.body;

  console.log('🧠 Datos extraídos:', { name, email, picture });

  if (!name || !email || !picture) {
    console.error('❌ Faltan datos del usuario de Google:', req.body);
    return res.status(400).json({ error: 'Faltan datos del usuario de Google' });
  }

  const checkQuery = 'SELECT * FROM users WHERE email = ?';
  connection.query(checkQuery, [email], (err, results) => {
    if (err) {
      console.error('❌ Error al buscar usuario:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (results.length > 0) {
      console.log('✅ Usuario ya existe en la BD');
      return res.status(200).json({
        message: '✅ Bienvenido de nuevo (Google)',
        user: {
          id: results[0].id,
          name: results[0].name,
          email: results[0].email
        }
      });
    } else {
      console.log('🆕 Usuario nuevo, insertando en la BD');
      const insertQuery = 'INSERT INTO users (name, email, picture) VALUES (?, ?, ?)';
      connection.query(insertQuery, [name, email, picture], (err, result) => {
        if (err) {
          console.error('❌ Error al registrar con Google:', err);
          return res.status(500).json({ error: 'Error al registrar usuario de Google' });
        }

        console.log('✅ Usuario registrado con Google en la BD');
        return res.status(201).json({
          message: '✅ Usuario creado con Google',
          user: {
            id: result.insertId,
            name,
            email,
            picture
          }
        });
      });
    }
  });
});
// 🔐 Login clásico con email y contraseña
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  console.log("📨 Intento de login:", email);

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan email o contraseña' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';

  connection.query(query, [email], async (err, results) => {
    if (err) {
      console.error('❌ Error al buscar usuario:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }

    if (results.length === 0) {
       console.warn("❌ Usuario no encontrado:", email);
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = results[0];

    console.log('🧠 contraseña recibida:', password);
    console.log('🧠 contraseña en BD:', user.password);
    const validPassword = await bcrypt.compare(password, user.password);
    console.log("✅ Resultado de comparación:", validPassword);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    console.log('✅ Login exitoso:', user.email);
    return res.json({
      message: '✅ Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
});


module.exports = router;
