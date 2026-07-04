// ===============================
// Rutas para buscador global
// ===============================

const express = require('express');
const connection = require('../db/connection');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas las búsquedas globales deben estar protegidas con token
router.use(authMiddleware);

// Convierte connection.query en promesa para poder usar async/await
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(results);
    });
  });
}

// GET /api/search?q=texto
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const searchText = String(req.query.q || '').trim();

  if (!searchText) {
    return res.status(400).json({
      mensaje: 'Debes ingresar un texto para buscar.'
    });
  }

  const searchLike = `%${searchText}%`;

  try {
    const tasksSql = `
      SELECT
        id,
        'task' AS type,
        title,
        description,
        category,
        priority,
        due_date AS date_value,
        NULL AS time_value,
        status,
        NULL AS amount,
        created_at
      FROM tasks
      WHERE user_id = ?
        AND (
          title LIKE ?
          OR description LIKE ?
          OR category LIKE ?
          OR priority LIKE ?
          OR status LIKE ?
          OR DATE_FORMAT(due_date, '%Y-%m-%d') LIKE ?
          OR DATE_FORMAT(due_date, '%d/%m/%Y') LIKE ?
        )
      ORDER BY due_date ASC
      LIMIT 10
    `;

    const remindersSql = `
      SELECT
        id,
        'reminder' AS type,
        title,
        original_text AS description,
        category,
        repeat_type,
        reminder_date AS date_value,
        reminder_time AS time_value,
        status,
        NULL AS amount,
        created_at
      FROM reminders
      WHERE user_id = ?
        AND (
          title LIKE ?
          OR original_text LIKE ?
          OR category LIKE ?
          OR repeat_type LIKE ?
          OR status LIKE ?
          OR DATE_FORMAT(reminder_date, '%Y-%m-%d') LIKE ?
          OR DATE_FORMAT(reminder_date, '%d/%m/%Y') LIKE ?
        )
      ORDER BY reminder_date ASC, reminder_time ASC
      LIMIT 10
    `;

    const expensesSql = `
      SELECT
        id,
        'expense' AS type,
        description AS title,
        description,
        category,
        source,
        expense_date AS date_value,
        NULL AS time_value,
        NULL AS status,
        amount,
        created_at
      FROM expenses
      WHERE user_id = ?
        AND (
          description LIKE ?
          OR category LIKE ?
          OR source LIKE ?
          OR CAST(amount AS CHAR) LIKE ?
          OR DATE_FORMAT(expense_date, '%Y-%m-%d') LIKE ?
          OR DATE_FORMAT(expense_date, '%d/%m/%Y') LIKE ?
        )
      ORDER BY expense_date DESC
      LIMIT 10
    `;

    const monthlyIncomesSql = `
      SELECT
        id,
        'monthly_income' AS type,
        COALESCE(description, 'Ingreso mensual') AS title,
        description,
        'Ingreso principal' AS category,
        NULL AS source,
        month_key AS date_value,
        NULL AS time_value,
        NULL AS status,
        amount,
        created_at
      FROM monthly_incomes
      WHERE user_id = ?
        AND (
          month_key LIKE ?
          OR description LIKE ?
          OR CAST(amount AS CHAR) LIKE ?
        )
      ORDER BY month_key DESC
      LIMIT 10
    `;

    const additionalIncomesSql = `
      SELECT
        id,
        'additional_income' AS type,
        description AS title,
        description,
        'Ingreso adicional' AS category,
        source,
        income_date AS date_value,
        NULL AS time_value,
        NULL AS status,
        amount,
        created_at
      FROM additional_incomes
      WHERE user_id = ?
        AND (
          description LIKE ?
          OR source LIKE ?
          OR CAST(amount AS CHAR) LIKE ?
          OR month_key LIKE ?
          OR DATE_FORMAT(income_date, '%Y-%m-%d') LIKE ?
          OR DATE_FORMAT(income_date, '%d/%m/%Y') LIKE ?
        )
      ORDER BY income_date DESC
      LIMIT 10
    `;

    const [
      tasks,
      reminders,
      expenses,
      monthlyIncomes,
      additionalIncomes
    ] = await Promise.all([
      runQuery(tasksSql, [
        userId,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike
      ]),

      runQuery(remindersSql, [
        userId,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike
      ]),

      runQuery(expensesSql, [
        userId,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike
      ]),

      runQuery(monthlyIncomesSql, [
        userId,
        searchLike,
        searchLike,
        searchLike
      ]),

      runQuery(additionalIncomesSql, [
        userId,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike,
        searchLike
      ])
    ]);

    const results = [
      ...tasks,
      ...reminders,
      ...expenses,
      ...monthlyIncomes,
      ...additionalIncomes
    ];

    return res.json({
      query: searchText,
      total: results.length,
      resultsByType: {
        tasks,
        reminders,
        expenses,
        monthlyIncomes,
        additionalIncomes
      },
      results
    });

  } catch (error) {
    console.error('Error en buscador global:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al realizar la búsqueda global.'
    });
  }
});

module.exports = router;