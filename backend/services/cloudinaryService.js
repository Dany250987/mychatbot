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

module.exports = {
  configureCloudinary,
  pingCloudinary
};