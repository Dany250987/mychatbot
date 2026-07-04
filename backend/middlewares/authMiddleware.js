const jwt = require('jsonwebtoken');
const connection = require('../db/connection');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token no enviado. Inicia sesión nuevamente.'
    });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. Inicia sesión nuevamente.'
    });
  }

  const token = parts[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: 'JWT_SECRET no está configurado en el servidor.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const sql = `
      SELECT id, name, email
      FROM users
      WHERE id = ?
      LIMIT 1
    `;

    connection.query(sql, [decoded.id], (error, results) => {
      if (error) {
        console.error('❌ Error al validar usuario del token:', error);

        return res.status(500).json({
          error: 'Error al validar la sesión del usuario.'
        });
      }

      if (results.length === 0) {
        return res.status(401).json({
          error: 'La cuenta ya no existe. Inicia sesión nuevamente.'
        });
      }

      const user = results[0];

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };

      next();
    });

  } catch (error) {
    return res.status(401).json({
      error: 'Sesión vencida o token inválido. Inicia sesión nuevamente.'
    });
  }
}

module.exports = authMiddleware;