const express = require('express');
const multer = require('multer');

const connection = require('../db/connection');
const authMiddleware = require(
  '../middlewares/authMiddleware'
);

const {
  uploadDocumentToCloudinary,
  readStoredDocument,
  deleteStoredDocument
} = require(
  '../services/documentStorageService'
);

const router = express.Router();


// ========================================
// CONFIGURACIÓN DE ARCHIVOS
// ========================================

const allowedDocumentMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const documentUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, callback) => {
    if (
      !allowedDocumentMimeTypes.includes(
        file.mimetype
      )
    ) {
      return callback(
        new Error(
          'Tipo de archivo no permitido. Solo se permite PDF, JPG, PNG o WEBP.'
        )
      );
    }

    callback(null, true);
  }
});


function handleDocumentUpload(
  req,
  res,
  next
) {
  documentUpload.single('file')(
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
            'El documento no puede superar los 5 MB'
        });
      }

      return res.status(400).json({
        mensaje:
          error.message ||
          'No se pudo cargar el documento'
      });
    }
  );
}


// ========================================
// CONSULTAS ASÍNCRONAS
// ========================================

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


function hasStoredDocument(
  documentData = {}
) {
  return Boolean(
    documentData.file_path ||
    documentData.cloudinary_public_id
  );
}


async function safelyDeleteStoredDocument(
  documentData,
  context
) {
  if (
    !documentData ||
    !hasStoredDocument(documentData)
  ) {
    return;
  }

  try {
    const deletionResult =
      await deleteStoredDocument(
        documentData
      );

    if (
      deletionResult.result !== 'ok' &&
      deletionResult.result !==
        'not_found' &&
      deletionResult.result !==
        'skipped'
    ) {
      console.warn(
        `Resultado al eliminar documento (${context}):`,
        deletionResult
      );
    }
  } catch (error) {
    console.error(
      `No se pudo eliminar el documento almacenado (${context}):`,
      error
    );
  }
}


// ========================================
// TODAS LAS RUTAS REQUIEREN SESIÓN
// ========================================

router.use(authMiddleware);


// ========================================
// CONSULTAR DOCUMENTOS DEL USUARIO
// GET /api/documents
// ========================================

router.get('/', async (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      id,
      document_name,
      file_name,
      file_mime_type,
      file_size_bytes,
      created_at,
      updated_at
    FROM personal_documents
    WHERE user_id = ?
    ORDER BY updated_at DESC, id DESC
  `;

  try {
    const results = await queryAsync(
      sql,
      [userId]
    );

    return res.json({
      mensaje:
        'Documentos consultados correctamente',
      documents: results
    });
  } catch (error) {
    console.error(
      'Error al consultar documentos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al consultar los documentos'
    });
  }
});


// ========================================
// CONSULTAR UN DOCUMENTO
// GET /api/documents/:id
// ========================================

router.get('/:id', async (req, res) => {
  const userId = req.user.id;
  const documentId = req.params.id;

  const sql = `
    SELECT
      id,
      document_name,
      file_name,
      file_mime_type,
      file_size_bytes,
      created_at,
      updated_at
    FROM personal_documents
    WHERE id = ?
      AND user_id = ?
    LIMIT 1
  `;

  try {
    const results = await queryAsync(
      sql,
      [documentId, userId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró el documento'
      });
    }

    return res.json({
      mensaje:
        'Documento consultado correctamente',
      document: results[0]
    });
  } catch (error) {
    console.error(
      'Error al consultar documento:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al consultar el documento'
    });
  }
});


// ========================================
// ABRIR O DESCARGAR ARCHIVO
// GET /api/documents/:id/file
// ========================================

router.get(
  '/:id/file',
  async (req, res) => {
    const userId = req.user.id;
    const documentId = req.params.id;

    const sql = `
      SELECT
        document_name,
        file_name,
        file_path,
        file_mime_type,
        file_size_bytes,
        storage_provider,
        cloudinary_public_id,
        cloudinary_resource_type,
        cloudinary_delivery_type,
        cloudinary_format
      FROM personal_documents
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `;

    let results;

    try {
      results = await queryAsync(
        sql,
        [documentId, userId]
      );
    } catch (error) {
      console.error(
        'Error al consultar archivo del documento:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar el documento'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró el documento'
      });
    }

    const documentData = results[0];

    if (!hasStoredDocument(documentData)) {
      return res.status(404).json({
        mensaje:
          'El documento no tiene un archivo registrado'
      });
    }

    try {
      const storedDocument =
        await readStoredDocument(
          documentData
        );

      const safeFileName = String(
        documentData.file_name ||
        documentData.document_name ||
        'documento'
      )
        .replace(/[\r\n"]/g, '')
        .trim();

      res.setHeader(
        'Content-Type',
        documentData.file_mime_type ||
        storedDocument.contentType ||
        'application/octet-stream'
      );

      res.setHeader(
        'Content-Length',
        storedDocument.buffer.length
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${safeFileName}"`
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
        .send(storedDocument.buffer);

    } catch (error) {
      if (
        error.code ===
          'DOCUMENT_NOT_FOUND' ||
        error.code ===
          'DOCUMENT_LOCATION_MISSING'
      ) {
        return res.status(404).json({
          mensaje:
            'El archivo del documento no existe'
        });
      }

      console.error(
        'Error al recuperar documento:',
        error
      );

      return res.status(502).json({
        mensaje:
          'No se pudo recuperar el archivo almacenado'
      });
    }
  }
);


// ========================================
// CREAR DOCUMENTO
// POST /api/documents
// Campos:
// document_name
// file
// ========================================

router.post(
  '/',
  handleDocumentUpload,
  async (req, res) => {
    const userId = req.user.id;

    const documentName = String(
      req.body.document_name || ''
    ).trim();

    if (!documentName) {
      return res.status(400).json({
        mensaje:
          'El nombre del documento es obligatorio'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        mensaje:
          'Debes seleccionar un archivo'
      });
    }

    let fileData;

    try {
      fileData =
        await uploadDocumentToCloudinary({
          file: req.file,
          userId
        });
    } catch (error) {
      console.error(
        'Error al almacenar documento:',
        error
      );

      return res.status(502).json({
        mensaje:
          'No se pudo almacenar el documento'
      });
    }

    const sql = `
      INSERT INTO personal_documents (
        user_id,
        document_name,
        file_name,
        file_path,
        file_mime_type,
        file_size_bytes,
        storage_provider,
        cloudinary_asset_id,
        cloudinary_public_id,
        cloudinary_resource_type,
        cloudinary_delivery_type,
        cloudinary_format
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `;

    const values = [
      userId,
      documentName,
      fileData.file_name,
      fileData.file_path,
      fileData.file_mime_type,
      fileData.file_size_bytes,
      fileData.storage_provider,
      fileData.cloudinary_asset_id,
      fileData.cloudinary_public_id,
      fileData.cloudinary_resource_type,
      fileData.cloudinary_delivery_type,
      fileData.cloudinary_format
    ];

    try {
      const result = await queryAsync(
        sql,
        values
      );

      return res.status(201).json({
        mensaje:
          'Documento guardado correctamente',
        documentId: result.insertId
      });

    } catch (error) {
      console.error(
        'Error al registrar documento:',
        error
      );

      await safelyDeleteStoredDocument(
        fileData,
        'registro fallido'
      );

      return res.status(500).json({
        mensaje:
          'Error al registrar el documento'
      });
    }
  }
);


// ========================================
// EDITAR DOCUMENTO
// PUT /api/documents/:id
// Permite cambiar nombre y archivo
// ========================================

router.put(
  '/:id',
  handleDocumentUpload,
  async (req, res) => {
    const userId = req.user.id;
    const documentId = req.params.id;

    const documentName = String(
      req.body.document_name || ''
    ).trim();

    if (!documentName) {
      return res.status(400).json({
        mensaje:
          'El nombre del documento es obligatorio'
      });
    }

    const selectSql = `
      SELECT
        file_name,
        file_path,
        file_mime_type,
        file_size_bytes,
        storage_provider,
        cloudinary_asset_id,
        cloudinary_public_id,
        cloudinary_resource_type,
        cloudinary_delivery_type,
        cloudinary_format
      FROM personal_documents
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `;

    let selectResults;

    try {
      selectResults = await queryAsync(
        selectSql,
        [documentId, userId]
      );
    } catch (error) {
      console.error(
        'Error al consultar documento antes de editar:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar el documento'
      });
    }

    if (selectResults.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró el documento'
      });
    }

    const previousDocument =
      selectResults[0];

    let newFileData = null;

    if (req.file) {
      try {
        newFileData =
          await uploadDocumentToCloudinary({
            file: req.file,
            userId
          });
      } catch (error) {
        console.error(
          'Error al almacenar nuevo archivo:',
          error
        );

        return res.status(502).json({
          mensaje:
            'No se pudo almacenar el nuevo archivo'
        });
      }
    }

    let sql = `
      UPDATE personal_documents
      SET document_name = ?
    `;

    const values = [
      documentName
    ];

    if (newFileData) {
      sql += `,
        file_name = ?,
        file_path = ?,
        file_mime_type = ?,
        file_size_bytes = ?,
        storage_provider = ?,
        cloudinary_asset_id = ?,
        cloudinary_public_id = ?,
        cloudinary_resource_type = ?,
        cloudinary_delivery_type = ?,
        cloudinary_format = ?
      `;

      values.push(
        newFileData.file_name,
        newFileData.file_path,
        newFileData.file_mime_type,
        newFileData.file_size_bytes,
        newFileData.storage_provider,
        newFileData.cloudinary_asset_id,
        newFileData.cloudinary_public_id,
        newFileData.cloudinary_resource_type,
        newFileData.cloudinary_delivery_type,
        newFileData.cloudinary_format
      );
    }

    sql += `
      WHERE id = ?
        AND user_id = ?
    `;

    values.push(
      documentId,
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
        'Error al actualizar documento:',
        error
      );

      if (newFileData) {
        await safelyDeleteStoredDocument(
          newFileData,
          'actualización fallida'
        );
      }

      return res.status(500).json({
        mensaje:
          'Error al actualizar el documento'
      });
    }

    if (result.affectedRows === 0) {
      if (newFileData) {
        await safelyDeleteStoredDocument(
          newFileData,
          'documento no encontrado'
        );
      }

      return res.status(404).json({
        mensaje:
          'No se encontró el documento'
      });
    }

    if (
      newFileData &&
      hasStoredDocument(previousDocument)
    ) {
      await safelyDeleteStoredDocument(
        previousDocument,
        'reemplazo de archivo'
      );
    }

    return res.json({
      mensaje:
        'Documento actualizado correctamente'
    });
  }
);


// ========================================
// ELIMINAR DOCUMENTO
// DELETE /api/documents/:id
// ========================================

router.delete(
  '/:id',
  async (req, res) => {
    const userId = req.user.id;
    const documentId = req.params.id;

    const selectSql = `
      SELECT
        file_name,
        file_path,
        file_mime_type,
        file_size_bytes,
        storage_provider,
        cloudinary_asset_id,
        cloudinary_public_id,
        cloudinary_resource_type,
        cloudinary_delivery_type,
        cloudinary_format
      FROM personal_documents
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `;

    let selectResults;

    try {
      selectResults = await queryAsync(
        selectSql,
        [documentId, userId]
      );
    } catch (error) {
      console.error(
        'Error al consultar documento antes de eliminar:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar el documento'
      });
    }

    if (selectResults.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró el documento'
      });
    }

    const storedDocument =
      selectResults[0];

    const deleteSql = `
      DELETE FROM personal_documents
      WHERE id = ?
        AND user_id = ?
    `;

    let result;

    try {
      result = await queryAsync(
        deleteSql,
        [documentId, userId]
      );
    } catch (error) {
      console.error(
        'Error al eliminar documento:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al eliminar el documento'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró el documento'
      });
    }

    await safelyDeleteStoredDocument(
      storedDocument,
      'eliminación de documento'
    );

    return res.json({
      mensaje:
        'Documento eliminado correctamente'
    });
  }
);


module.exports = router;