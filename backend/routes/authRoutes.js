const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const dns = require('dns').promises;
const nodemailer = require('nodemailer');

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

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function isValidEmailFormat(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
}

async function hasValidEmailDomain(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const domain = cleanEmail.split('@')[1];

  if (!domain) {
    return false;
  }

  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch (error) {
    return false;
  }
}

async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID no está configurado en el archivo .env');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw new Error('No se pudo obtener el correo desde Google.');
  }

  if (!payload.email_verified) {
    throw new Error('El correo de Google no está verificado.');
  }

  return {
    name: payload.name || payload.email,
    email: payload.email,
    picture: payload.picture || null
  };
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

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatDateTimeForMySQL(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function createEmailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendVerificationEmail(email, code) {
  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Código de verificación - DanyBot',
    text: `Tu código de verificación es: ${code}. Este código vence en 10 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #2b0b0b;">
        <h2>Código de verificación</h2>
        <p>Usa este código para completar tu registro en DanyBot:</p>

        <div style="
          display: inline-block;
          padding: 14px 22px;
          background: #f8eaea;
          color: #960018;
          border-radius: 12px;
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 4px;
        ">
          ${code}
        </div>

        <p style="margin-top: 18px;">
          Este código vence en 10 minutos.
        </p>
      </div>
    `
  });
}

// ===============================
// Enviar código de verificación
// ===============================

router.post('/send-verification-code', async (req, res) => {
  const { name, email, password, date_of_birth, phone_number } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Nombre, correo y contraseña son obligatorios.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmailFormat(normalizedEmail)) {
      return res.status(400).json({
        error: 'Ingresa un correo electrónico válido.'
      });
    }

  const hasEmailDomain = await hasValidEmailDomain(normalizedEmail);

  if (!hasEmailDomain) {
      return res.status(400).json({
        error: 'El dominio del correo no parece válido. Revisa el correo e intenta nuevamente.'
      });
    }

  try {
    const existingUsers = await queryAsync(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Ya existe una cuenta registrada con este correo.'
      });
    }

    const isDeletedAccount = await isDeletedAccountEmail(normalizedEmail);

    if (isDeletedAccount) {
      return res.status(403).json({
        error: 'Esta cuenta fue eliminada anteriormente y no puede registrarse de nuevo.'
      });
    }

    const verificationCode = createVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const expiresAtMySQL = formatDateTimeForMySQL(expiresAt);

    const passwordHash = await bcrypt.hash(password, 10);

    await queryAsync(
      `
        INSERT INTO email_verifications
          (name, email, password_hash, date_of_birth, phone_number, verification_code, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          date_of_birth = VALUES(date_of_birth),
          phone_number = VALUES(phone_number),
          verification_code = VALUES(verification_code),
          expires_at = VALUES(expires_at),
          created_at = CURRENT_TIMESTAMP
      `,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        date_of_birth || null,
        phone_number || null,
        verificationCode,
        expiresAtMySQL
      ]
    );

    await sendVerificationEmail(normalizedEmail, verificationCode);

    return res.json({
      mensaje: 'Código de verificación enviado al correo.'
    });

  } catch (error) {
    console.error('❌ Error al enviar código de verificación:', error);

    return res.status(500).json({
      error: 'No se pudo enviar el código de verificación.'
    });
  }
});

// ===============================
// Verificar código y crear cuenta
// ===============================

router.post('/verify-email-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      error: 'Correo y código son obligatorios.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const verificationRows = await queryAsync(
      `
        SELECT *
        FROM email_verifications
        WHERE email = ?
          AND verification_code = ?
          AND expires_at > NOW()
        LIMIT 1
      `,
      [
        normalizedEmail,
        String(code).trim()
      ]
    );

    if (verificationRows.length === 0) {
      return res.status(400).json({
        error: 'El código es incorrecto o ya venció.'
      });
    }

    const verification = verificationRows[0];

    const existingUsers = await queryAsync(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Ya existe una cuenta registrada con este correo.'
      });
    }

    await queryAsync(
      `
        INSERT INTO users
          (name, email, password, date_of_birth, phone_number)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        verification.name,
        verification.email,
        verification.password_hash,
        verification.date_of_birth || null,
        verification.phone_number || null
      ]
    );

    await queryAsync(
      'DELETE FROM email_verifications WHERE email = ?',
      [normalizedEmail]
    );

    return res.status(201).json({
      mensaje: 'Cuenta creada y correo verificado correctamente.'
    });

  } catch (error) {
    console.error('❌ Error al verificar código:', error);

    return res.status(500).json({
      error: 'No se pudo verificar el código.'
    });
  }
});

// ===============================
// Registro clásico bloqueado
// Ahora el registro debe hacerse con código de verificación
// ===============================

router.post('/register', (req, res) => {
  return res.status(410).json({
    error: 'El registro directo ya no está disponible. Debes verificar el correo con código antes de crear la cuenta.'
  });
});

// ===============================
// Login con Google
// Google solo inicia sesión si la cuenta ya existe.
// La creación de cuentas nuevas debe hacerse con código de verificación.
// ===============================

router.post('/google-login', async (req, res) => {
  const jwtConfigError = validateJwtConfig(res);

  if (jwtConfigError) {
    return;
  }

  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      error: 'Token de Google no enviado.'
    });
  }

  try {
    const googleUser = await verifyGoogleCredential(credential);
    const normalizedEmail = googleUser.email.trim().toLowerCase();

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

    if (users.length === 0) {
      return res.status(404).json({
        error: 'No existe una cuenta registrada con este correo. Primero crea tu cuenta con verificación por código.'
      });
    }

    const user = users[0];
    const userResponse = buildUserResponse(user, googleUser.picture);
    const token = createAuthToken(userResponse);

    return res.status(200).json({
      message: 'Bienvenida de nuevo',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('❌ Error en login con Google:', error);

    return res.status(401).json({
      error: error.message || 'No se pudo validar la cuenta de Google.'
    });
  }
});


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