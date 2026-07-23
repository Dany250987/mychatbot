// Importamos mysql2 para conectarnos a MySQL local o TiDB
const mysql = require('mysql2');

// Importamos fs para leer el certificado CA cuando se use TLS
const fs = require('fs');

// Importamos path para manejar rutas de archivos
const path = require('path');

// Cargamos las variables del archivo .env.
// En Railway las variables ya est?n disponibles en process.env.
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const dbPort = Number.parseInt(
  process.env.DB_PORT || '3306',
  10
);

if (
  !Number.isInteger(dbPort) ||
  dbPort < 1 ||
  dbPort > 65535
) {
  throw new Error(
    'DB_PORT debe contener un puerto v?lido entre 1 y 65535.'
  );
}

const dbSslEnabled = [
  'true',
  '1',
  'yes'
].includes(
  String(process.env.DB_SSL || '')
    .trim()
    .toLowerCase()
);

function getSslConfiguration() {
  if (!dbSslEnabled) {
    return undefined;
  }

  if (process.env.DB_SSL_CA) {
    return {
      ca: process.env.DB_SSL_CA.replace(
        /\\n/g,
        '\n'
      ),
      rejectUnauthorized: true
    };
  }

  if (process.env.DB_CA_PATH) {
    const resolvedCaPath = path.resolve(
      process.env.DB_CA_PATH
    );

    if (!fs.existsSync(resolvedCaPath)) {
      throw new Error(
        `No se encontr? el certificado CA configurado en DB_CA_PATH: ${resolvedCaPath}`
      );
    }

    return {
      ca: fs.readFileSync(
        resolvedCaPath,
        'utf8'
      ),
      rejectUnauthorized: true
    };
  }

  throw new Error(
    'DB_SSL est? activado, pero no se configur? DB_SSL_CA ni DB_CA_PATH.'
  );
}

const connectionConfig = {
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const sslConfiguration =
  getSslConfiguration();

if (sslConfiguration) {
  connectionConfig.ssl =
    sslConfiguration;
}

// El pool reemplaza autom?ticamente conexiones cerradas
// y evita reutilizar una conexi?n ?nica caducada.
const pool = mysql.createPool(
  connectionConfig
);

// Validaci?n inicial sin dejar una conexi?n reservada.
pool.getConnection((error, poolConnection) => {
  if (error) {
    console.error(
      '? Error al conectar a la base de datos:',
      {
        code: error.code,
        message: error.message
      }
    );

    return;
  }

  console.log(
    dbSslEnabled
      ? '? Pool conectado a la base de datos mediante TLS'
      : '? Pool conectado a MySQL local'
  );

  poolConnection.release();
});

pool.on('connection', (poolConnection) => {
  poolConnection.on('error', (error) => {
    console.error(
      '?? Error en una conexi?n del pool:',
      {
        code: error.code,
        message: error.message
      }
    );
  });
});

module.exports = pool;
