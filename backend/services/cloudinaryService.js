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
  userId
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

  const cloudinaryClient = configureCloudinary();

  const publicId = [
    'danybot',
    'evidencias',
    `usuario-${parsedUserId}`,
    randomUUID()
  ].join('/');

  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinaryClient.uploader.upload_stream(
        {
          resource_type: 'auto',
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

          resolve(result);
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

module.exports = {
  configureCloudinary,
  pingCloudinary,
  uploadEvidenceBuffer,
  deleteEvidenceFromCloudinary
};