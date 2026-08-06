const fs = require('fs');
const path = require('path');

const {
  uploadPrivateFileBuffer,
  downloadEvidenceFromCloudinary,
  deleteEvidenceFromCloudinary
} = require('./cloudinaryService');

const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(__dirname, '../..');

const documentExtensionByMimeType = Object.freeze({
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
});

function isPathInsideRoot(candidatePath, rootPath) {
  const relativePath = path.relative(
    rootPath,
    candidatePath
  );

  return (
    relativePath === '' ||
    (
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath)
    )
  );
}

function isCloudinaryDocument(documentData = {}) {
  const provider = String(
    documentData.storage_provider || ''
  ).toLowerCase();

  return (
    provider === 'cloudinary' ||
    Boolean(documentData.cloudinary_public_id)
  );
}

function resolveLocalDocumentPath(filePath) {
  if (
    typeof filePath !== 'string' ||
    filePath.trim() === ''
  ) {
    return null;
  }

  const originalPath = filePath.trim();

  const cleanRelativePath = originalPath.replace(
    /^[/\\]+/,
    ''
  );

  const candidates = path.isAbsolute(originalPath)
    ? [
        path.resolve(originalPath)
      ]
    : [
        path.resolve(
          backendRoot,
          cleanRelativePath
        ),
        path.resolve(
          projectRoot,
          cleanRelativePath
        )
      ];

  const safeCandidates = candidates.filter(
    (candidatePath) => {
      return (
        isPathInsideRoot(candidatePath, backendRoot) ||
        isPathInsideRoot(candidatePath, projectRoot)
      );
    }
  );

  if (safeCandidates.length === 0) {
    throw new Error(
      'La ruta local del documento no es segura.'
    );
  }

  return (
    safeCandidates.find((candidatePath) => {
      return fs.existsSync(candidatePath);
    }) ||
    safeCandidates[0]
  );
}

function sanitizeDocumentFileName(originalName) {
  const fallbackName = 'documento';

  if (
    typeof originalName !== 'string' ||
    originalName.trim() === ''
  ) {
    return fallbackName;
  }

  return path
    .basename(originalName.trim())
    .replace(/\0/g, '') ||
    fallbackName;
}

function getDocumentFileExtension(file = {}) {
  const mimeType = String(
    file.mimetype || ''
  ).toLowerCase();

  const extensionFromMime =
    documentExtensionByMimeType[mimeType];

  if (extensionFromMime) {
    return extensionFromMime;
  }

  const safeFileName =
    sanitizeDocumentFileName(
      file.originalname
    );

  const extensionFromName = path
    .extname(safeFileName)
    .slice(1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!extensionFromName) {
    throw new TypeError(
      'No se pudo determinar la extensión del documento.'
    );
  }

  return extensionFromName;
}

async function uploadDocumentToCloudinary({
  file,
  userId
}) {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    file.buffer.length === 0
  ) {
    throw new TypeError(
      'No se recibió un documento válido.'
    );
  }

  const fileExtension =
    getDocumentFileExtension(file);

  const uploadResult =
    await uploadPrivateFileBuffer({
      buffer: file.buffer,
      userId,
      fileExtension,
      moduleFolder: 'documentos'
    });

  return {
    file_name:
      sanitizeDocumentFileName(
        file.originalname
      ),

    file_path:
      null,

    file_mime_type:
      file.mimetype ||
      'application/octet-stream',

    file_size_bytes:
      file.size ||
      file.buffer.length,

    storage_provider:
      'cloudinary',

    cloudinary_asset_id:
      uploadResult.asset_id,

    cloudinary_public_id:
      uploadResult.public_id,

    cloudinary_resource_type:
      uploadResult.resource_type,

    cloudinary_delivery_type:
      uploadResult.type,

    cloudinary_format:
      uploadResult.format ||
      fileExtension
  };
}

async function readStoredDocument(
  documentData = {}
) {
  if (isCloudinaryDocument(documentData)) {
    return downloadEvidenceFromCloudinary({
      publicId:
        documentData.cloudinary_public_id,

      format:
        documentData.cloudinary_format,

      resourceType:
        documentData.cloudinary_resource_type,

      deliveryType:
        documentData.cloudinary_delivery_type ||
        'authenticated'
    });
  }

  const fullPath = resolveLocalDocumentPath(
    documentData.file_path
  );

  if (!fullPath) {
    const error = new Error(
      'El documento no tiene una ubicación registrada.'
    );

    error.code =
      'DOCUMENT_LOCATION_MISSING';

    throw error;
  }

  try {
    const buffer =
      await fs.promises.readFile(fullPath);

    if (buffer.length === 0) {
      const error = new Error(
        'El archivo local del documento está vacío.'
      );

      error.code = 'DOCUMENT_EMPTY';

      throw error;
    }

    return {
      buffer,

      contentType:
        documentData.file_mime_type ||
        'application/octet-stream',

      bytes:
        buffer.length
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      const notFoundError = new Error(
        'El archivo del documento no existe en el servidor.'
      );

      notFoundError.code =
        'DOCUMENT_NOT_FOUND';

      throw notFoundError;
    }

    throw error;
  }
}

async function deleteStoredDocument(
  documentData = {}
) {
  if (isCloudinaryDocument(documentData)) {
    const result =
      await deleteEvidenceFromCloudinary({
        publicId:
          documentData.cloudinary_public_id,

        resourceType:
          documentData.cloudinary_resource_type,

        deliveryType:
          documentData.cloudinary_delivery_type ||
          'authenticated'
      });

    return {
      provider: 'cloudinary',
      result: result.result
    };
  }

  const fullPath = resolveLocalDocumentPath(
    documentData.file_path
  );

  if (!fullPath) {
    return {
      provider: null,
      result: 'skipped'
    };
  }

  try {
    await fs.promises.unlink(fullPath);

    return {
      provider: 'local',
      result: 'ok'
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        provider: 'local',
        result: 'not_found'
      };
    }

    throw error;
  }
}

async function deleteStoredDocumentCollection(
  documents = []
) {
  if (!Array.isArray(documents)) {
    throw new TypeError(
      'La colección de documentos no es válida.'
    );
  }

  return Promise.allSettled(
    documents.map((documentData) => {
      return deleteStoredDocument(
        documentData
      );
    })
  );
}

module.exports = {
  isCloudinaryDocument,
  resolveLocalDocumentPath,
  sanitizeDocumentFileName,
  getDocumentFileExtension,
  uploadDocumentToCloudinary,
  readStoredDocument,
  deleteStoredDocument,
  deleteStoredDocumentCollection
};