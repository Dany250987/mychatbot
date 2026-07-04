const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const connection = require('../db/connection');
const authMiddleware = require('../middlewares/authMiddleware');

// ===============================
// Helpers de autenticación
// ===============================

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

function buildUserResponse(user, fallbackPicture = null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture || fallbackPicture || null
  };
}

function validateJwtConfig(res) {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: 'JWT_SECRET no está configurado en el archivo .env'
    });
  }

  return null;
}

function getEmailHash(email) {
  return crypto
    .createHash('sha256')
    .update(String(email).trim().toLowerCase())
    .digest('hex');
}

async function isDeletedAccountEmail(email) {
  const emailHash = getEmailHash(email);

  const results = await queryAsync(
    `
      SELECT id
      FROM deleted_accounts
      WHERE email_hash = ?
      LIMIT 1
    `,
    [emailHash]
  );

  return results.length > 0;
}

// ===============================
// Helpers para consultas con promesas
// ===============================


function beginTransactionAsync() {
  return new Promise((resolve, reject) => {
    connection.beginTransaction((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function commitAsync() {
  return new Promise((resolve, reject) => {
    connection.commit((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function rollbackAsync() {
  return new Promise((resolve) => {
    connection.rollback(() => {
      resolve();
    });
  });
}

function getEvidenceFullPath(evidenceFilePath) {
  if (!evidenceFilePath) {
    return null;
  }

  if (path.isAbsolute(evidenceFilePath)) {
    return evidenceFilePath;
  }

  const cleanPath = evidenceFilePath.replace(/^[/\\]+/, '');

  const candidates = [
    path.join(__dirname, '..', cleanPath),
    path.join(__dirname, '../..', cleanPath)
  ];

  const existingPath = candidates.find((candidate) => {
    return fs.existsSync(candidate);
  });

  return existingPath || candidates[0];
}

function deleteEvidenceFiles(evidenceFiles = []) {
  evidenceFiles.forEach((file) => {
    const evidenceFilePath = file.evidence_file_path;

    if (!evidenceFilePath) {
      return;
    }

    const fullPath = getEvidenceFullPath(evidenceFilePath);

    fs.unlink(fullPath, (error) => {
      if (error && error.code !== 'ENOENT') {
        console.error('No se pudo eliminar evidencia:', fullPath, error);
      }
    });
  });
}

// ===============================
// Registro clásico
// ===============================
function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(results);
    });
  });
}


router.post('/register', async (req, res) => {
  const { name, email, password, date_of_birth, phone_number } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios'
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const isDeletedAccount = await isDeletedAccountEmail(normalizedEmail);

      if (isDeletedAccount) {
        return res.status(403).json({
          error: 'Esta cuenta fue eliminada anteriormente. No se puede iniciar sesión nuevamente con este correo.'
        });
      }
    } catch (error) {
      console.error('❌ Error al validar cuenta eliminada:', error);

      return res.status(500).json({
        error: 'Error al validar el estado de la cuenta'
      });
    }

    const isDeletedAccount = await isDeletedAccountEmail(normalizedEmail);

    if (isDeletedAccount) {
      return res.status(403).json({
        error: 'Esta cuenta fue eliminada anteriormente y no puede registrarse de nuevo automáticamente.'
      });
    }

    const checkQuery = 'SELECT id FROM users WHERE email = ?';

    connection.query(checkQuery, [normalizedEmail], async (checkErr, existingUsers) => {
      if (checkErr) {
        console.error('❌ Error al validar usuario existente:', checkErr);

        return res.status(500).json({
          error: 'Error al validar el usuario'
        });
      }

      if (existingUsers.length > 0) {
        return res.status(409).json({
          error: 'Ya existe una cuenta registrada con este correo'
        });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const query = `
        INSERT INTO users 
          (name, email, password, date_of_birth, phone_number)
        VALUES (?, ?, ?, ?, ?)
      `;

      const values = [
        name.trim(),
        normalizedEmail,
        hashedPassword,
        date_of_birth || null,
        phone_number || null
      ];

      connection.query(query, values, (err) => {
        if (err) {
          console.error('❌ Error al registrar usuario:', err);

          return res.status(500).json({
            error: 'Error al registrar el usuario'
          });
        }

        return res.status(201).json({
          message: '✅ Usuario registrado exitosamente'
        });
      });
    });

  } catch (error) {
    console.error('❌ Error al registrar usuario:', error);

    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// ===============================
// Registro/Login con Google
// ===============================


router.post('/google-login', async (req, res) => {
  const jwtConfigError = validateJwtConfig(res);

  if (jwtConfigError) {
    return;
  }

  const { name, email, picture } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: 'Faltan datos del usuario de Google'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const isDeletedAccount = await isDeletedAccountEmail(normalizedEmail);

    if (isDeletedAccount) {
      return res.status(403).json({
        error: 'Esta cuenta fue eliminada anteriormente. No se puede iniciar sesión nuevamente con este correo.'
      });
    }

    const users = await queryAsync(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (users.length > 0) {
      const user = users[0];
      const userResponse = buildUserResponse(user, picture);
      const token = createAuthToken(userResponse);

      return res.status(200).json({
        message: 'Bienvenido de nuevo',
        user: userResponse,
        token
      });
    }

    const result = await queryAsync(
      `
        INSERT INTO users (name, email, picture)
        VALUES (?, ?, ?)
      `,
      [
        name.trim(),
        normalizedEmail,
        picture || null
      ]
    );

    const newUser = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
      picture: picture || null
    };

    const token = createAuthToken(newUser);

    return res.status(201).json({
      message: 'Usuario creado con Google',
      user: newUser,
      token
    });

  } catch (error) {
    console.error('❌ Error en login con Google:', error);

    return res.status(500).json({
      error: 'Error al procesar el login con Google'
    });
  }
});
// ===============================
// Login clásico con email y contraseña
// ===============================

router.post('/login', (req, res) => {
  const jwtConfigError = validateJwtConfig(res);

  if (jwtConfigError) {
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Faltan email o contraseña'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const query = 'SELECT * FROM users WHERE email = ?';

  connection.query(query, [normalizedEmail], async (err, results) => {
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

    if (!user.password) {
      return res.status(401).json({
        error: 'Esta cuenta fue creada con Google. Inicia sesión con Google.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos'
      });
    }

    const userResponse = buildUserResponse(user);
    const token = createAuthToken(userResponse);

    return res.json({
      message: 'Login exitoso',
      user: userResponse,
      token
    });
  });
});

// ===============================
// Eliminar cuenta
// ===============================

router.delete('/account', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { password, confirmation } = req.body;

  if (confirmation !== 'ELIMINAR') {
    return res.status(400).json({
      mensaje: 'Para eliminar la cuenta debes escribir ELIMINAR.'
    });
  }

  let transactionStarted = false;
  let evidenceFiles = [];

  try {
    const users = await queryAsync(
      'SELECT id, email, password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró la cuenta del usuario.'
      });
    }

    const user = users[0];

    if (user.password) {
      if (!password) {
        return res.status(400).json({
          mensaje: 'Debes ingresar tu contraseña para eliminar la cuenta.'
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({
          mensaje: 'La contraseña no es correcta.'
        });
      }
    }

    evidenceFiles = await queryAsync(
      `
        SELECT evidence_file_path
        FROM expenses
        WHERE user_id = ?
          AND evidence_file_path IS NOT NULL
      `,
      [userId]
    );

    await beginTransactionAsync();
    transactionStarted = true;
        await queryAsync(
      `
        INSERT INTO deleted_accounts (email_hash, reason)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE 
          deleted_at = CURRENT_TIMESTAMP,
          reason = VALUES(reason)
      `,
      [
        getEmailHash(user.email),
        'user_deleted_account'
      ]
    );

    await queryAsync(
      'DELETE FROM additional_incomes WHERE user_id = ?',
      [userId]
    );

    await queryAsync(
      'DELETE FROM monthly_incomes WHERE user_id = ?',
      [userId]
    );

    await queryAsync(
      'DELETE FROM expenses WHERE user_id = ?',
      [userId]
    );

    await queryAsync(
      'DELETE FROM reminders WHERE user_id = ?',
      [userId]
    );

    await queryAsync(
      'DELETE FROM tasks WHERE user_id = ?',
      [userId]
    );

    await queryAsync(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    await commitAsync();

    deleteEvidenceFiles(evidenceFiles);

    return res.json({
      mensaje: 'Cuenta eliminada correctamente.'
    });

  } catch (error) {
    console.error('❌ Error al eliminar cuenta:', error);

    if (transactionStarted) {
      await rollbackAsync();
    }

    return res.status(500).json({
      mensaje: 'Ocurrió un error al eliminar la cuenta.'
    });
  }
});

module.exports = router;