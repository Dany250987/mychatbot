// Importamos Express para crear rutas
const express = require('express');

// Importamos módulos para manejar rutas y archivos
const path = require('path');
const fs = require('fs');

// Importamos multer para recibir archivos
const multer = require('multer');

// Importamos la conexión a MySQL
const connection = require('../db/connection');

// Importamos el middleware de autenticación
const authMiddleware = require('../middlewares/authMiddleware');

// Creamos el router de Express
const router = express.Router();


// ===============================
// Configuración de evidencias
// ===============================

const evidenceUploadDirectory = path.join(__dirname, '..', 'uploads', 'expenses');

if (!fs.existsSync(evidenceUploadDirectory)) {
  fs.mkdirSync(evidenceUploadDirectory, { recursive: true });
}

const allowedEvidenceMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const evidenceStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, evidenceUploadDirectory);
  },
  filename: (req, file, callback) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `expense-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;

    callback(null, uniqueName);
  }
});

const evidenceUpload = multer({
  storage: evidenceStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (!allowedEvidenceMimeTypes.includes(file.mimetype)) {
      return callback(new Error('Tipo de archivo no permitido. Solo se permite PDF, JPG, PNG o WEBP.'));
    }

    callback(null, true);
  }
});

function handleEvidenceUpload(req, res, next) {
  evidenceUpload.single('evidence')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        mensaje: 'La evidencia no puede superar los 5 MB'
      });
    }

    return res.status(400).json({
      mensaje: error.message || 'No se pudo cargar la evidencia'
    });
  });
}

function getEvidenceData(file) {
  if (!file) {
    return {
      evidence_file_name: null,
      evidence_file_path: null,
      evidence_mime_type: null,
      evidence_size_bytes: null
    };
  }

  return {
    evidence_file_name: file.filename,
    evidence_file_path: path.join('uploads', 'expenses', file.filename).replace(/\\/g, '/'),
    evidence_mime_type: file.mimetype,
    evidence_size_bytes: file.size
  };
}

function deleteEvidenceFile(evidenceFilePath) {
  if (!evidenceFilePath) {
    return;
  }

  const fullPath = path.join(__dirname, '..', evidenceFilePath);

  fs.unlink(fullPath, (error) => {
    if (error && error.code !== 'ENOENT') {
      console.error('⚠️ No se pudo eliminar la evidencia:', error);
    }
  });
}


// ===============================
// Ruta de prueba pública
// ===============================

router.get('/test', (req, res) => {
  res.json({
    mensaje: '✅ Ruta de gastos funcionando correctamente'
  });
});


// A partir de aquí, todas las rutas de gastos requieren token
router.use(authMiddleware);


// ===============================
// Consultar gastos
// GET http://localhost:3000/api/expenses
// ===============================

router.get('/', (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      id,
      user_id,
      expense_date,
      category,
      description,
      amount,
      source,
      evidence_file_name,
      evidence_file_path,
      evidence_mime_type,
      evidence_size_bytes,
      created_at,
      updated_at
    FROM expenses
    WHERE user_id = ?
    ORDER BY expense_date DESC, id DESC
  `;

  connection.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar gastos:', err);

      return res.status(500).json({
        mensaje: 'Error al consultar los gastos'
      });
    }

    res.json({
      mensaje: 'Gastos consultados correctamente',
      gastos: results
    });
  });
});


// ===============================
// Ver evidencia de un gasto
// GET http://localhost:3000/api/expenses/3/evidence
// ===============================

router.get('/:id/evidence', (req, res) => {
  const userId = req.user.id;
  const expenseId = req.params.id;

  const sql = `
    SELECT 
      evidence_file_name,
      evidence_file_path,
      evidence_mime_type
    FROM expenses
    WHERE id = ? AND user_id = ?
  `;

  connection.query(sql, [expenseId, userId], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar evidencia:', err);

      return res.status(500).json({
        mensaje: 'Error al consultar la evidencia'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el gasto'
      });
    }

    const expense = results[0];

    if (!expense.evidence_file_path) {
      return res.status(404).json({
        mensaje: 'Este gasto no tiene evidencia registrada'
      });
    }

    const fullPath = path.join(__dirname, '..', expense.evidence_file_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        mensaje: 'El archivo de evidencia no existe en el servidor'
      });
    }

    res.setHeader('Content-Type', expense.evidence_mime_type || 'application/octet-stream');
    res.sendFile(fullPath);
  });
});


// ===============================
// Crear gasto con evidencia opcional
// POST http://localhost:3000/api/expenses
// Campo archivo opcional: evidence
// ===============================

router.post('/', handleEvidenceUpload, (req, res) => {
  const userId = req.user.id;

  const {
    expense_date,
    category,
    description,
    amount,
    source
  } = req.body;

  if (!expense_date || !category || !description || !amount) {
    if (req.file) {
      deleteEvidenceFile(req.file.path);
    }

    return res.status(400).json({
      mensaje: 'Faltan datos obligatorios para registrar el gasto'
    });
  }

  const evidenceData = getEvidenceData(req.file);

  const sql = `
    INSERT INTO expenses (
      user_id,
      expense_date,
      category,
      description,
      amount,
      source,
      evidence_file_name,
      evidence_file_path,
      evidence_mime_type,
      evidence_size_bytes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    expense_date,
    category,
    description,
    amount,
    source || 'manual',
    evidenceData.evidence_file_name,
    evidenceData.evidence_file_path,
    evidenceData.evidence_mime_type,
    evidenceData.evidence_size_bytes
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error al registrar gasto:', err);

      if (req.file) {
        deleteEvidenceFile(req.file.path);
      }

      return res.status(500).json({
        mensaje: 'Error al registrar el gasto'
      });
    }

    res.status(201).json({
      mensaje: 'Gasto registrado correctamente',
      gastoId: result.insertId
    });
  });
});


// ===============================
// Editar gasto con evidencia opcional
// PUT http://localhost:3000/api/expenses/3
// Si no se envía evidencia, conserva la evidencia anterior
// ===============================

router.put('/:id', handleEvidenceUpload, (req, res) => {
  const userId = req.user.id;
  const expenseId = req.params.id;

  const {
    expense_date,
    category,
    description,
    amount,
    source
  } = req.body;

  if (!expense_date || !category || !description || !amount) {
    if (req.file) {
      deleteEvidenceFile(req.file.path);
    }

    return res.status(400).json({
      mensaje: 'Faltan datos obligatorios para actualizar el gasto'
    });
  }

  const selectSql = `
    SELECT evidence_file_path
    FROM expenses
    WHERE id = ? AND user_id = ?
  `;

  connection.query(selectSql, [expenseId, userId], (selectErr, selectResults) => {
    if (selectErr) {
      console.error('❌ Error al consultar gasto antes de actualizar:', selectErr);

      if (req.file) {
        deleteEvidenceFile(req.file.path);
      }

      return res.status(500).json({
        mensaje: 'Error al consultar el gasto'
      });
    }

    if (selectResults.length === 0) {
      if (req.file) {
        deleteEvidenceFile(req.file.path);
      }

      return res.status(404).json({
        mensaje: 'No se encontró el gasto para actualizar'
      });
    }

    const previousEvidencePath = selectResults[0].evidence_file_path;
    const evidenceData = getEvidenceData(req.file);

    let sql = `
      UPDATE expenses
      SET
        expense_date = ?,
        category = ?,
        description = ?,
        amount = ?,
        source = ?
    `;

    const values = [
      expense_date,
      category,
      description,
      amount,
      source || 'manual'
    ];

    if (req.file) {
      sql += `,
        evidence_file_name = ?,
        evidence_file_path = ?,
        evidence_mime_type = ?,
        evidence_size_bytes = ?
      `;

      values.push(
        evidenceData.evidence_file_name,
        evidenceData.evidence_file_path,
        evidenceData.evidence_mime_type,
        evidenceData.evidence_size_bytes
      );
    }

    sql += `
      WHERE id = ? AND user_id = ?
    `;

    values.push(expenseId, userId);

    connection.query(sql, values, (updateErr, result) => {
      if (updateErr) {
        console.error('❌ Error al actualizar gasto:', updateErr);

        if (req.file) {
          deleteEvidenceFile(req.file.path);
        }

        return res.status(500).json({
          mensaje: 'Error al actualizar el gasto'
        });
      }

      if (result.affectedRows === 0) {
        if (req.file) {
          deleteEvidenceFile(req.file.path);
        }

        return res.status(404).json({
          mensaje: 'No se encontró el gasto para actualizar'
        });
      }

      if (req.file && previousEvidencePath) {
        deleteEvidenceFile(previousEvidencePath);
      }

      res.json({
        mensaje: 'Gasto actualizado correctamente'
      });
    });
  });
});


// ===============================
// Eliminar gasto
// DELETE http://localhost:3000/api/expenses/3
// También elimina la evidencia física si existe
// ===============================

router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const expenseId = req.params.id;

  const selectSql = `
    SELECT evidence_file_path
    FROM expenses
    WHERE id = ? AND user_id = ?
  `;

  connection.query(selectSql, [expenseId, userId], (selectErr, selectResults) => {
    if (selectErr) {
      console.error('❌ Error al consultar gasto antes de eliminar:', selectErr);

      return res.status(500).json({
        mensaje: 'Error al consultar el gasto'
      });
    }

    if (selectResults.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el gasto para eliminar'
      });
    }

    const evidenceFilePath = selectResults[0].evidence_file_path;

    const deleteSql = `
      DELETE FROM expenses
      WHERE id = ? AND user_id = ?
    `;

    connection.query(deleteSql, [expenseId, userId], (deleteErr, result) => {
      if (deleteErr) {
        console.error('❌ Error al eliminar gasto:', deleteErr);

        return res.status(500).json({
          mensaje: 'Error al eliminar el gasto'
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          mensaje: 'No se encontró el gasto para eliminar'
        });
      }

      deleteEvidenceFile(evidenceFilePath);

      res.json({
        mensaje: 'Gasto eliminado correctamente'
      });
    });
  });
});


// Exportamos el router para poder usarlo en server.js
module.exports = router;