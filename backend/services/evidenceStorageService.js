const fs = require('fs');
const path = require('path');

const {
  uploadEvidenceBuffer,
  downloadEvidenceFromCloudinary,
  deleteEvidenceFromCloudinary
} = require('./cloudinaryService');

const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(__dirname, '../..');

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

function isCloudinaryEvidence(evidence = {}) {
  const provider = String(
    evidence.evidence_storage_provider || ''
  ).toLowerCase();

  return (
    provider === 'cloudinary' ||
    Boolean(evidence.evidence_cloudinary_public_id)
  );
}

function resolveLocalEvidencePath(evidenceFilePath) {
  if (
    typeof evidenceFilePath !== 'string' ||
    evidenceFilePath.trim() === ''
  ) {
    return null;
  }

  const originalPath = evidenceFilePath.trim();

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
      'La ruta local de la evidencia no es segura.'
    );
  }

  return (
    safeCandidates.find((candidatePath) => {
      return fs.existsSync(candidatePath);
    }) ||
    safeCandidates[0]
  );
}

function sanitizeEvidenceFileName(originalName) {
  const fallbackName = 'evidencia';

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

async function uploadEvidenceToCloudinary({
  file,
  userId
}) {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    file.buffer.length === 0
  ) {
    throw new TypeError(
      'No se recibió una evidencia válida.'
    );
  }

  const uploadResult = await uploadEvidenceBuffer({
    buffer: file.buffer,
    userId
  });

  return {
    evidence_file_name:
      sanitizeEvidenceFileName(file.originalname),

    evidence_file_path:
      null,

    evidence_mime_type:
      file.mimetype ||
      'application/octet-stream',

    evidence_size_bytes:
      file.size || file.buffer.length,

    evidence_storage_provider:
      'cloudinary',

    evidence_cloudinary_asset_id:
      uploadResult.asset_id,

    evidence_cloudinary_public_id:
      uploadResult.public_id,

    evidence_cloudinary_resource_type:
      uploadResult.resource_type,

    evidence_cloudinary_delivery_type:
      uploadResult.type,

    evidence_cloudinary_format:
      uploadResult.format
  };
}

async function readStoredEvidence(evidence = {}) {
  if (isCloudinaryEvidence(evidence)) {
    return downloadEvidenceFromCloudinary({
      publicId:
        evidence.evidence_cloudinary_public_id,

      format:
        evidence.evidence_cloudinary_format,

      resourceType:
        evidence.evidence_cloudinary_resource_type,

      deliveryType:
        evidence.evidence_cloudinary_delivery_type ||
        'authenticated'
    });
  }

  const fullPath = resolveLocalEvidencePath(
    evidence.evidence_file_path
  );

  if (!fullPath) {
    const error = new Error(
      'La evidencia no tiene una ubicación registrada.'
    );

    error.code = 'EVIDENCE_LOCATION_MISSING';

    throw error;
  }

  try {
    const buffer =
      await fs.promises.readFile(fullPath);

    if (buffer.length === 0) {
      const error = new Error(
        'El archivo local de evidencia está vacío.'
      );

      error.code = 'EVIDENCE_EMPTY';

      throw error;
    }

    return {
      buffer,

      contentType:
        evidence.evidence_mime_type ||
        'application/octet-stream',

      bytes:
        buffer.length
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      const notFoundError = new Error(
        'El archivo de evidencia no existe en el servidor.'
      );

      notFoundError.code = 'EVIDENCE_NOT_FOUND';

      throw notFoundError;
    }

    throw error;
  }
}

async function deleteStoredEvidence(evidence = {}) {
  if (isCloudinaryEvidence(evidence)) {
    const result =
      await deleteEvidenceFromCloudinary({
        publicId:
          evidence.evidence_cloudinary_public_id,

        resourceType:
          evidence.evidence_cloudinary_resource_type,

        deliveryType:
          evidence.evidence_cloudinary_delivery_type ||
          'authenticated'
      });

    return {
      provider: 'cloudinary',
      result: result.result
    };
  }

  const fullPath = resolveLocalEvidencePath(
    evidence.evidence_file_path
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

async function deleteStoredEvidenceCollection(
  evidences = []
) {
  if (!Array.isArray(evidences)) {
    throw new TypeError(
      'La colección de evidencias no es válida.'
    );
  }

  return Promise.allSettled(
    evidences.map((evidence) => {
      return deleteStoredEvidence(evidence);
    })
  );
}

module.exports = {
  isCloudinaryEvidence,
  resolveLocalEvidencePath,
  uploadEvidenceToCloudinary,
  readStoredEvidence,
  deleteStoredEvidence,
  deleteStoredEvidenceCollection
};