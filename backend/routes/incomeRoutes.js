// Importamos Express para crear rutas
const express = require('express');

// Importamos la conexión a MySQL
const connection = require('../db/connection');

// Importamos el middleware de autenticación
const authMiddleware = require('../middlewares/authMiddleware');

// Creamos el router
const router = express.Router();


// Todas las rutas de ingresos requieren token
router.use(authMiddleware);


// Ruta para consultar el ingreso mensual principal del usuario autenticado
// GET http://localhost:3000/api/incomes?month=2026-06
router.get('/', (req, res) => {
  const userId = req.user.id;
  const month = req.query.month;

  if (!month) {
    return res.status(400).json({
      mensaje: 'El mes es obligatorio para consultar el ingreso mensual'
    });
  }

  const sql = `
    SELECT 
      id,
      user_id,
      month_key,
      amount,
      description,
      created_at,
      updated_at
    FROM monthly_incomes
    WHERE user_id = ? AND month_key = ?
  `;

  connection.query(sql, [userId, month], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar ingreso mensual:', err);

      return res.status(500).json({
        mensaje: 'Error al consultar el ingreso mensual'
      });
    }

    if (results.length === 0) {
      return res.json({
        mensaje: 'No hay ingreso registrado para este mes',
        income: null
      });
    }

    res.json({
      mensaje: 'Ingreso mensual consultado correctamente',
      income: results[0]
    });
  });
});


// Ruta para guardar o actualizar el ingreso mensual principal
// Si ya existe ingreso para ese usuario y mes, lo actualiza.
// Si no existe, lo crea.
// POST http://localhost:3000/api/incomes
router.post('/', (req, res) => {
  const userId = req.user.id;

  const {
    month_key,
    amount,
    description
  } = req.body;

  if (!month_key || !amount) {
    return res.status(400).json({
      mensaje: 'El mes y el valor del ingreso son obligatorios'
    });
  }

  const sql = `
    INSERT INTO monthly_incomes (
      user_id,
      month_key,
      amount,
      description
    )
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      amount = VALUES(amount),
      description = VALUES(description),
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = [
    userId,
    month_key,
    amount,
    description || 'Ingreso mensual principal'
  ];

  connection.query(sql, values, (err) => {
    if (err) {
      console.error('❌ Error al guardar ingreso mensual:', err);

      return res.status(500).json({
        mensaje: 'Error al guardar el ingreso mensual'
      });
    }

    res.status(201).json({
      mensaje: 'Ingreso mensual guardado correctamente'
    });
  });
});


// Ruta para consultar ingresos adicionales del mes
// GET http://localhost:3000/api/incomes/additional?month=2026-06
router.get('/additional', (req, res) => {
  const userId = req.user.id;
  const month = req.query.month;

  if (!month) {
    return res.status(400).json({
      mensaje: 'El mes es obligatorio para consultar ingresos adicionales'
    });
  }

  const sql = `
    SELECT
      id,
      user_id,
      month_key,
      income_date,
      description,
      amount,
      source,
      created_at,
      updated_at
    FROM additional_incomes
    WHERE user_id = ? AND month_key = ?
    ORDER BY income_date DESC, id DESC
  `;

  connection.query(sql, [userId, month], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar ingresos adicionales:', err);

      return res.status(500).json({
        mensaje: 'Error al consultar los ingresos adicionales'
      });
    }

    res.json({
      mensaje: 'Ingresos adicionales consultados correctamente',
      additionalIncomes: results
    });
  });
});


// Ruta para guardar un ingreso adicional
// POST http://localhost:3000/api/incomes/additional
router.post('/additional', (req, res) => {
  const userId = req.user.id;

  const {
    month_key,
    income_date,
    description,
    amount,
    source
  } = req.body;

  if (!month_key || !income_date || !description || !amount) {
    return res.status(400).json({
      mensaje: 'Faltan datos obligatorios para registrar el ingreso adicional'
    });
  }

  const sql = `
    INSERT INTO additional_incomes (
      user_id,
      month_key,
      income_date,
      description,
      amount,
      source
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    month_key,
    income_date,
    description,
    amount,
    source || 'manual'
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error al guardar ingreso adicional:', err);

      return res.status(500).json({
        mensaje: 'Error al guardar el ingreso adicional'
      });
    }

    res.status(201).json({
      mensaje: 'Ingreso adicional guardado correctamente',
      additionalIncomeId: result.insertId
    });
  });
});


// Ruta para editar un ingreso adicional del usuario autenticado
// PUT http://localhost:3000/api/incomes/additional/1
router.put('/additional/:id', (req, res) => {
  const userId = req.user.id;
  const additionalIncomeId = req.params.id;

  const {
    month_key,
    income_date,
    description,
    amount,
    source
  } = req.body;

  if (!month_key || !income_date || !description || !amount) {
    return res.status(400).json({
      mensaje: 'Faltan datos obligatorios para actualizar el ingreso adicional'
    });
  }

  const sql = `
    UPDATE additional_incomes
    SET
      month_key = ?,
      income_date = ?,
      description = ?,
      amount = ?,
      source = ?
    WHERE id = ? AND user_id = ?
  `;

  const values = [
    month_key,
    income_date,
    description,
    amount,
    source || 'manual',
    additionalIncomeId,
    userId
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar ingreso adicional:', err);

      return res.status(500).json({
        mensaje: 'Error al actualizar el ingreso adicional'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el ingreso adicional para actualizar'
      });
    }

    res.json({
      mensaje: 'Ingreso adicional actualizado correctamente'
    });
  });
});


// Ruta para eliminar un ingreso adicional del usuario autenticado
// DELETE http://localhost:3000/api/incomes/additional/1
router.delete('/additional/:id', (req, res) => {
  const userId = req.user.id;
  const additionalIncomeId = req.params.id;

  const sql = `
    DELETE FROM additional_incomes
    WHERE id = ? AND user_id = ?
  `;

  connection.query(sql, [additionalIncomeId, userId], (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar ingreso adicional:', err);

      return res.status(500).json({
        mensaje: 'Error al eliminar el ingreso adicional'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el ingreso adicional para eliminar'
      });
    }

    res.json({
      mensaje: 'Ingreso adicional eliminado correctamente'
    });
  });
});


// Exportamos el router para usarlo en server.js
module.exports = router;