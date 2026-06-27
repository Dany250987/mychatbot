// Importamos la librería mysql2 para conectarnos a MySQL
const mysql = require('mysql2');

// Importamos path para manejar rutas de archivos
const path = require('path');

// Cargamos las variables del archivo .env
// El .env está en la raíz del proyecto, no dentro de backend
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

// Creamos la conexión a MySQL usando variables de entorno
// Así evitamos dejar usuario y contraseña escritos directamente en el código
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Intentamos conectar con la base de datos
connection.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar a MySQL:', err);
    return;
  }

  console.log('✅ Conectado a MySQL');
});

// Exportamos la conexión para usarla en otros archivos
module.exports = connection;
