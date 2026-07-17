const { randomUUID } = require('crypto');
const { v2: cloudinary } = require('cloudinary');

const requiredEnvironmentVariables = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

let isConfigured = false;

function readRequiredEnvironmentVariable(variableName) {
  const value = process.env[variableName];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Falta la variable de entorno obligatoria: ${variableName}`
    );
  }

  return value.trim();
}

function configureCloudinary() {
  if (isConfigured) {
    return cloudinary;
  }

  requiredEnvironmentVariables.forEach(
    readRequiredEnvironmentVariable
  );

  cloudinary.config({
    cloud_name: readRequiredEnvironmentVariable(
      'CLOUDINARY_CLOUD_NAME'
    ),
    api_key: readRequiredEnvironmentVariable(
      'CLOUDINARY_API_KEY'
    ),
    api_secret: readRequiredEnvironmentVariable(
      'CLOUDINARY_API_SECRET'
    ),
    secure: true
  });

  isConfigured = true;

  return cloudinary;
}

async function pingCloudinary() {
  const cloudinaryClient = configureCloudinary();

  return cloudinaryClient.api.ping();
}

function uploadEvidenceBuffer({
  buffer,
  userId,
  fileExtension
}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return Promise.reject(
      new TypeError('La evidencia debe ser un buffer válido.')
    );
  }

  const parsedUserId = Number.parseInt(userId, 10);

  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    return Promise.reject(
      new TypeError('El identificador del usuario no es válido.')
    );
  }

  const normalizedExtension = String(
    fileExtension || ''
  )
    .trim()
    .toLowerCase()
    .replace(/^\./, '');

  if (!/^[a-z0-9]{1,10}$/.test(normalizedExtension)) {
    return Promise.reject(
      new TypeError(
        'La extensi?n de la evidencia no es v?lida.'
      )
    );
  }

  const cloudinaryClient = configureCloudinary();

  const publicId = [
    'danybot',
    'evidencias',
    `usuario-${parsedUserId}`,
    `${randomUUID()}.${normalizedExtension}`
  ].join('/');

  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinaryClient.uploader.upload_stream(
        {
          resource_type: 'raw',
          type: 'authenticated',
          public_id: publicId,
          overwrite: false,
          use_filename: false,
          unique_filename: false
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (
            !result ||
            !result.asset_id ||
            !result.public_id ||
            !result.resource_type ||
            !result.type
          ) {
            reject(
              new Error(
                'Cloudinary no devolvió todos los metadatos esperados.'
              )
            );
            return;
          }

          resolve({
            ...result,
            format: normalizedExtension
          });
        }
      );

    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

async function deleteEvidenceFromCloudinary({
  publicId,
  resourceType,
  deliveryType = 'authenticated'
}) {
  if (typeof publicId !== 'string' || publicId.trim() === '') {
    throw new TypeError(
      'El public_id de Cloudinary es obligatorio.'
    );
  }

  if (
    typeof resourceType !== 'string' ||
    resourceType.trim() === ''
  ) {
    throw new TypeError(
      'El resource_type de Cloudinary es obligatorio.'
    );
  }

  const cloudinaryClient = configureCloudinary();

  return cloudinaryClient.uploader.destroy(
    publicId.trim(),
    {
      resource_type: resourceType.trim(),
      type: deliveryType,
      invalidate: true
    }
  );
}

function createEvidenceDownloadUrl({
  publicId,
  format,
  resourceType,
  deliveryType = 'authenticated',
  expiresInSeconds = 60
}) {
  if (typeof publicId !== 'string' || publicId.trim() === '') {
    throw new TypeError(
      'El public_id de Cloudinary es obligatorio.'
    );
  }

  if (typeof format !== 'string' || format.trim() === '') {
    throw new TypeError(
      'El formato de la evidencia es obligatorio.'
    );
  }

  if (
    typeof resourceType !== 'string' ||
    resourceType.trim() === ''
  ) {
    throw new TypeError(
      'El resource_type de Cloudinary es obligatorio.'
    );
  }

  const parsedExpiration = Number.parseInt(
    expiresInSeconds,
    10
  );

  if (
    !Number.isInteger(parsedExpiration) ||
    parsedExpiration < 1 ||
    parsedExpiration > 300
  ) {
    throw new TypeError(
      'La vigencia de descarga debe estar entre 1 y 300 segundos.'
    );
  }

  const cloudinaryClient = configureCloudinary();

  const expiresAt =
    Math.floor(Date.now() / 1000) + parsedExpiration;

  return cloudinaryClient.utils.private_download_url(
    publicId.trim(),
    format.trim(),
    {
      resource_type: resourceType.trim(),
      type: deliveryType.trim(),
      expires_at: expiresAt,
      attachment: false
    }
  );
}

async function downloadEvidenceFromCloudinary({
  publicId,
  format,
  resourceType,
  deliveryType = 'authenticated'
}) {
  const signedDownloadUrl = createEvidenceDownloadUrl({
    publicId,
    format,
    resourceType,
    deliveryType,
    expiresInSeconds: 60
  });

  const abortController = new AbortController();

  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, 15000);

  try {
    const response = await fetch(
      signedDownloadUrl,
      {
        method: 'GET',
        redirect: 'follow',
        signal: abortController.signal
      }
    );

    if (!response.ok) {
      throw new Error(
        `Cloudinary respondió con estado ${response.status}.`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error(
        'Cloudinary devolvió una evidencia vacía.'
      );
    }

    return {
      buffer,
      contentType:
        response.headers.get('content-type') ||
        'application/octet-stream',
      bytes: buffer.length
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        'La descarga desde Cloudinary superó el tiempo permitido.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  configureCloudinary,
  pingCloudinary,
  uploadEvidenceBuffer,
  deleteEvidenceFromCloudinary,
  createEvidenceDownloadUrl,
  downloadEvidenceFromCloudinary
};