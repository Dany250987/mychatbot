// Importamos la librería mysql2 para conectarnos a MySQL o TiDB
const mysql = require('mysql2');

// Importamos fs para leer el certificado CA cuando se use TLS
const fs = require('fs');

// Importamos path para manejar rutas de archivos
const path = require('path');

// Cargamos las variables del archivo .env
// El .env está en la raíz del proyecto, no dentro de backend
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

// TiDB utiliza un puerto propio.
// Para MySQL local se conserva 3306 como valor predeterminado.
const dbPort = Number.parseInt(process.env.DB_PORT || '3306', 10);

if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
  throw new Error('DB_PORT debe contener un puerto válido entre 1 y 65535.');
}

// TLS solo se activa cuando DB_SSL tiene un valor afirmativo.
const dbSslEnabled = ['true', '1', 'yes'].includes(
  String(process.env.DB_SSL || '').trim().toLowerCase()
);

function getSslConfiguration() {
  if (!dbSslEnabled) {
    return null;
  }

  // Permite configurar el certificado directamente como variable de entorno.
  // Esta alternativa puede usarse posteriormente en el servidor remoto.
  if (process.env.DB_SSL_CA) {
    return {
      ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'),
      rejectUnauthorized: true
    };
  }

  // También permite leer el certificado desde un archivo local o secreto.
  if (process.env.DB_CA_PATH) {
    const resolvedCaPath = path.resolve(process.env.DB_CA_PATH);

    if (!fs.existsSync(resolvedCaPath)) {
      throw new Error(
        `No se encontró el certificado CA configurado en DB_CA_PATH: ${resolvedCaPath}`
      );
    }

    return {
      ca: fs.readFileSync(resolvedCaPath, 'utf8'),
      rejectUnauthorized: true
    };
  }

  throw new Error(
    'DB_SSL está activado, pero no se configuró DB_SSL_CA ni DB_CA_PATH.'
  );
}

const connectionConfig = {
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4'
};

const sslConfiguration = getSslConfiguration();

if (sslConfiguration) {
  connectionConfig.ssl = sslConfiguration;
}

// Creamos una única conexión que reutilizan actualmente las rutas del backend
const connection = mysql.createConnection(connectionConfig);

// Intentamos conectar con la base de datos
connection.connect((error) => {
  if (error) {
    console.error('❌ Error al conectar a la base de datos:', {
      code: error.code,
      message: error.message
    });
    return;
  }

  console.log(
    dbSslEnabled
      ? '✅ Conectado a la base de datos mediante TLS'
      : '✅ Conectado a MySQL local'
  );
});

// Exportamos la conexión para usarla en los demás archivos
module.exports = connection;