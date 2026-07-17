// Importamos Express para crear rutas
const express = require('express');

// Importamos multer para recibir archivos
const multer = require('multer');

// Importamos la conexión a la base de datos
const connection = require('../db/connection');

// Importamos el middleware de autenticación
const authMiddleware = require('../middlewares/authMiddleware');

// Importamos el servicio unificado de evidencias
const {
  uploadEvidenceToCloudinary,
  readStoredEvidence,
  deleteStoredEvidence
} = require('../services/evidenceStorageService');

// Creamos el router de Express
const router = express.Router();


// ===============================
// Configuración de evidencias
// ===============================

const allowedEvidenceMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const evidenceUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, callback) => {
    if (!allowedEvidenceMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error(
          'Tipo de archivo no permitido. Solo se permite PDF, JPG, PNG o WEBP.'
        )
      );
    }

    callback(null, true);
  }
});

function handleEvidenceUpload(req, res, next) {
  evidenceUpload.single('evidence')(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (
        error instanceof multer.MulterError &&
        error.code === 'LIMIT_FILE_SIZE'
      ) {
        return res.status(400).json({
          mensaje:
            'La evidencia no puede superar los 5 MB'
        });
      }

      return res.status(400).json({
        mensaje:
          error.message ||
          'No se pudo cargar la evidencia'
      });
    }
  );
}

function createEmptyEvidenceData() {
  return {
    evidence_file_name: null,
    evidence_file_path: null,
    evidence_mime_type: null,
    evidence_size_bytes: null,
    evidence_storage_provider: null,
    evidence_cloudinary_asset_id: null,
    evidence_cloudinary_public_id: null,
    evidence_cloudinary_resource_type: null,
    evidence_cloudinary_delivery_type: null,
    evidence_cloudinary_format: null
  };
}

function hasStoredEvidence(evidence = {}) {
  return Boolean(
    evidence.evidence_file_path ||
    evidence.evidence_cloudinary_public_id
  );
}

function queryAsync(sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(
      sql,
      values,
      (error, results) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(results);
      }
    );
  });
}

async function safelyDeleteStoredEvidence(
  evidence,
  context
) {
  if (!evidence || !hasStoredEvidence(evidence)) {
    return;
  }

  try {
    const deletionResult =
      await deleteStoredEvidence(evidence);

    if (
      deletionResult.result !== 'ok' &&
      deletionResult.result !== 'not_found' &&
      deletionResult.result !== 'skipped'
    ) {
      console.warn(
        `⚠️ Resultado de eliminación de evidencia (${context}):`,
        deletionResult
      );
    }
  } catch (error) {
    console.error(
      `⚠️ No se pudo eliminar la evidencia (${context}):`,
      error
    );
  }
}


// ===============================
// Ruta de prueba pública
// ===============================

router.get('/test', (req, res) => {
  res.json({
    mensaje:
      '✅ Ruta de gastos funcionando correctamente'
  });
});


// A partir de aquí todas las rutas requieren token
router.use(authMiddleware);


// ===============================
// Consultar gastos
// GET http://localhost:3000/api/expenses
// ===============================

router.get('/', async (req, res) => {
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

  try {
    const results = await queryAsync(
      sql,
      [userId]
    );

    return res.json({
      mensaje:
        'Gastos consultados correctamente',
      gastos: results
    });
  } catch (error) {
    console.error(
      '❌ Error al consultar gastos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al consultar los gastos'
    });
  }
});


// ===============================
// Ver evidencia de un gasto
// GET http://localhost:3000/api/expenses/3/evidence
// ===============================

router.get('/:id/evidence', async (req, res) => {
  const userId = req.user.id;
  const expenseId = req.params.id;

  const sql = `
    SELECT
      evidence_file_name,
      evidence_file_path,
      evidence_mime_type,
      evidence_size_bytes,
      evidence_storage_provider,
      evidence_cloudinary_public_id,
      evidence_cloudinary_resource_type,
      evidence_cloudinary_delivery_type,
      evidence_cloudinary_format
    FROM expenses
    WHERE id = ? AND user_id = ?
  `;

  let results;

  try {
    results = await queryAsync(
      sql,
      [expenseId, userId]
    );
  } catch (error) {
    console.error(
      '❌ Error al consultar evidencia:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al consultar la evidencia'
    });
  }

  if (results.length === 0) {
    return res.status(404).json({
      mensaje:
        'No se encontró el gasto'
    });
  }

  const expense = results[0];

  if (!hasStoredEvidence(expense)) {
    return res.status(404).json({
      mensaje:
        'Este gasto no tiene evidencia registrada'
    });
  }

  try {
    const storedEvidence =
      await readStoredEvidence(expense);

    res.setHeader(
      'Content-Type',
      expense.evidence_mime_type ||
      storedEvidence.contentType ||
      'application/octet-stream'
    );

    res.setHeader(
      'Content-Length',
      storedEvidence.buffer.length
    );

    res.setHeader(
      'Cache-Control',
      'private, no-store'
    );

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    return res
      .status(200)
      .send(storedEvidence.buffer);
  } catch (error) {
    if (
      error.code === 'EVIDENCE_NOT_FOUND' ||
      error.code === 'EVIDENCE_LOCATION_MISSING'
    ) {
      return res.status(404).json({
        mensaje:
          'El archivo de evidencia no existe en el servidor'
      });
    }

    console.error(
      '❌ Error al recuperar evidencia:',
      error
    );

    return res.status(502).json({
      mensaje:
        'No se pudo recuperar la evidencia almacenada'
    });
  }
});


// ===============================
// Crear gasto con evidencia opcional
// POST http://localhost:3000/api/expenses
// Campo archivo opcional: evidence
// ===============================

router.post(
  '/',
  handleEvidenceUpload,
  async (req, res) => {
    const userId = req.user.id;

    const {
      expense_date,
      category,
      description,
      amount,
      source
    } = req.body;

    if (
      !expense_date ||
      !category ||
      !description ||
      !amount
    ) {
      return res.status(400).json({
        mensaje:
          'Faltan datos obligatorios para registrar el gasto'
      });
    }

    let evidenceData =
      createEmptyEvidenceData();

    if (req.file) {
      try {
        evidenceData =
          await uploadEvidenceToCloudinary({
            file: req.file,
            userId
          });
      } catch (error) {
        console.error(
          '❌ Error al almacenar evidencia en Cloudinary:',
          error
        );

        return res.status(502).json({
          mensaje:
            'No se pudo almacenar la evidencia del gasto'
        });
      }
    }

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
        evidence_size_bytes,
        evidence_storage_provider,
        evidence_cloudinary_asset_id,
        evidence_cloudinary_public_id,
        evidence_cloudinary_resource_type,
        evidence_cloudinary_delivery_type,
        evidence_cloudinary_format
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
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
      evidenceData.evidence_size_bytes,
      evidenceData.evidence_storage_provider,
      evidenceData.evidence_cloudinary_asset_id,
      evidenceData.evidence_cloudinary_public_id,
      evidenceData.evidence_cloudinary_resource_type,
      evidenceData.evidence_cloudinary_delivery_type,
      evidenceData.evidence_cloudinary_format
    ];

    try {
      const result = await queryAsync(
        sql,
        values
      );

      return res.status(201).json({
        mensaje:
          'Gasto registrado correctamente',
        gastoId: result.insertId
      });
    } catch (error) {
      console.error(
        '❌ Error al registrar gasto:',
        error
      );

      if (req.file) {
        await safelyDeleteStoredEvidence(
          evidenceData,
          'registro de gasto fallido'
        );
      }

      return res.status(500).json({
        mensaje:
          'Error al registrar el gasto'
      });
    }
  }
);


// ===============================
// Editar gasto con evidencia opcional
// PUT http://localhost:3000/api/expenses/3
// Si no se envía evidencia, conserva la anterior
// ===============================

router.put(
  '/:id',
  handleEvidenceUpload,
  async (req, res) => {
    const userId = req.user.id;
    const expenseId = req.params.id;

    const {
      expense_date,
      category,
      description,
      amount,
      source
    } = req.body;

    if (
      !expense_date ||
      !category ||
      !description ||
      !amount
    ) {
      return res.status(400).json({
        mensaje:
          'Faltan datos obligatorios para actualizar el gasto'
      });
    }

    const selectSql = `
      SELECT
        evidence_file_name,
        evidence_file_path,
        evidence_mime_type,
        evidence_size_bytes,
        evidence_storage_provider,
        evidence_cloudinary_asset_id,
        evidence_cloudinary_public_id,
        evidence_cloudinary_resource_type,
        evidence_cloudinary_delivery_type,
        evidence_cloudinary_format
      FROM expenses
      WHERE id = ? AND user_id = ?
    `;

    let selectResults;

    try {
      selectResults = await queryAsync(
        selectSql,
        [expenseId, userId]
      );
    } catch (error) {
      console.error(
        '❌ Error al consultar gasto antes de actualizar:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar el gasto'
      });
    }

    if (selectResults.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró el gasto para actualizar'
      });
    }

    const previousEvidence =
      selectResults[0];

    let newEvidence = null;

    if (req.file) {
      try {
        newEvidence =
          await uploadEvidenceToCloudinary({
            file: req.file,
            userId
          });
      } catch (error) {
        console.error(
          '❌ Error al almacenar nueva evidencia:',
          error
        );

        return res.status(502).json({
          mensaje:
            'No se pudo almacenar la nueva evidencia'
        });
      }
    }

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

    if (newEvidence) {
      sql += `,
        evidence_file_name = ?,
        evidence_file_path = ?,
        evidence_mime_type = ?,
        evidence_size_bytes = ?,
        evidence_storage_provider = ?,
        evidence_cloudinary_asset_id = ?,
        evidence_cloudinary_public_id = ?,
        evidence_cloudinary_resource_type = ?,
        evidence_cloudinary_delivery_type = ?,
        evidence_cloudinary_format = ?
      `;

      values.push(
        newEvidence.evidence_file_name,
        newEvidence.evidence_file_path,
        newEvidence.evidence_mime_type,
        newEvidence.evidence_size_bytes,
        newEvidence.evidence_storage_provider,
        newEvidence.evidence_cloudinary_asset_id,
        newEvidence.evidence_cloudinary_public_id,
        newEvidence.evidence_cloudinary_resource_type,
        newEvidence.evidence_cloudinary_delivery_type,
        newEvidence.evidence_cloudinary_format
      );
    }

    sql += `
      WHERE id = ? AND user_id = ?
    `;

    values.push(
      expenseId,
      userId
    );

    let result;

    try {
      result = await queryAsync(
        sql,
        values
      );
    } catch (error) {
      console.error(
        '❌ Error al actualizar gasto:',
        error
      );

      if (newEvidence) {
        await safelyDeleteStoredEvidence(
          newEvidence,
          'actualización de gasto fallida'
        );
      }

      return res.status(500).json({
        mensaje:
          'Error al actualizar el gasto'
      });
    }

    if (result.affectedRows === 0) {
      if (newEvidence) {
        await safelyDeleteStoredEvidence(
          newEvidence,
          'gasto no encontrado al actualizar'
        );
      }

      return res.status(404).json({
        mensaje:
          'No se encontró el gasto para actualizar'
      });
    }

    if (
      newEvidence &&
      hasStoredEvidence(previousEvidence)
    ) {
      await safelyDeleteStoredEvidence(
        previousEvidence,
        'reemplazo de evidencia'
      );
    }

    return res.json({
      mensaje:
        'Gasto actualizado correctamente'
    });
  }
);


// ===============================
// Eliminar gasto
// DELETE http://localhost:3000/api/expenses/3
// También elimina la evidencia almacenada
// ===============================

router.delete('/:id', async (req, res) => {
  const userId = req.user.id;
  const expenseId = req.params.id;

  const selectSql = `
    SELECT
      evidence_file_name,
      evidence_file_path,
      evidence_mime_type,
      evidence_size_bytes,
      evidence_storage_provider,
      evidence_cloudinary_asset_id,
      evidence_cloudinary_public_id,
      evidence_cloudinary_resource_type,
      evidence_cloudinary_delivery_type,
      evidence_cloudinary_format
    FROM expenses
    WHERE id = ? AND user_id = ?
  `;

  let selectResults;

  try {
    selectResults = await queryAsync(
      selectSql,
      [expenseId, userId]
    );
  } catch (error) {
    console.error(
      '❌ Error al consultar gasto antes de eliminar:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al consultar el gasto'
    });
  }

  if (selectResults.length === 0) {
    return res.status(404).json({
      mensaje:
        'No se encontró el gasto para eliminar'
    });
  }

  const storedEvidence =
    selectResults[0];

  const deleteSql = `
    DELETE FROM expenses
    WHERE id = ? AND user_id = ?
  `;

  let result;

  try {
    result = await queryAsync(
      deleteSql,
      [expenseId, userId]
    );
  } catch (error) {
    console.error(
      '❌ Error al eliminar gasto:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al eliminar el gasto'
    });
  }

  if (result.affectedRows === 0) {
    return res.status(404).json({
      mensaje:
        'No se encontró el gasto para eliminar'
    });
  }

  if (hasStoredEvidence(storedEvidence)) {
    await safelyDeleteStoredEvidence(
      storedEvidence,
      'eliminación de gasto'
    );
  }

  return res.json({
    mensaje:
      'Gasto eliminado correctamente'
  });
});


// Exportamos el router para usarlo en server.js
module.exports = router;