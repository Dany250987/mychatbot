// Importamos Express para crear rutas
const express = require('express');

// Importamos la conexión a MySQL
const connection = require('../db/connection');

// Creamos el router de Express
const router = express.Router();


// Ruta de prueba
// Sirve para validar que las rutas de gastos están conectadas con server.js
router.get('/test', (req, res) => {
  res.json({
    mensaje: '✅ Ruta de gastos funcionando correctamente'
  });
});


// Ruta para consultar los gastos de un usuario
// Ejemplo de uso:
// GET http://localhost:3000/api/expenses?user_id=4
router.get('/', (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      mensaje: 'El user_id es obligatorio para consultar los gastos'
    });
  }

  const sql = `
    SELECT 
      id,
      user_id,
      expense_date,
      category,
      description,
      amount,
      source,
      created_at,
      updated_at
    FROM expenses
    WHERE user_id = ?
    ORDER BY expense_date DESC, id DESC
  `;

  connection.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar gastos:', err);

      return res.status(500).json({
        mensaje: 'Error al consultar los gastos'
      });
    }

    res.json({
      mensaje: 'Gastos consultados correctamente',
      gastos: results
    });
  });
});


// Ruta para crear un gasto
// Ejemplo de uso:
// POST http://localhost:3000/api/expenses
router.post('/', (req, res) => {
  const {
    user_id,
    expense_date,
    category,
    description,
    amount,
    source
  } = req.body;

  if (!user_id || !expense_date || !category || !description || !amount) {
    return res.status(400).json({
      mensaje: 'Faltan datos obligatorios para registrar el gasto'
    });
  }

  const sql = `
    INSERT INTO expenses (
      user_id,
      expense_date,
      category,
      description,
      amount,
      source
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [
    user_id,
    expense_date,
    category,
    description,
    amount,
    source || 'manual'
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error al registrar gasto:', err);

      return res.status(500).json({
        mensaje: 'Error al registrar el gasto'
      });
    }

    res.status(201).json({
      mensaje: 'Gasto registrado correctamente',
      gastoId: result.insertId
    });
  });
});


// Exportamos el router para poder usarlo en server.js
module.exports = router;