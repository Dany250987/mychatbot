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

function normalizeGlobalSearchTerm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const GLOBAL_SEARCH_VALUE_ALIASES = {
  low: ['baja'],
  medium: ['media'],
  high: ['alta'],

  once: ['una_vez'],
  daily: ['diario'],
  weekly: ['semanal'],
  monthly: ['mensual'],
  annual: ['anual'],
  yearly: ['anual'],

  active: ['activo'],
  completed: ['completado'],
  complete: ['completado'],
  trash: ['papelera'],
  deleted: ['papelera'],

  finance: ['finanzas'],
  finances: ['finanzas'],
  study: ['estudio'],
  studies: ['estudio'],
  work: ['trabajo'],
  health: ['salud'],
  payment: ['pagos'],
  payments: ['pagos'],
  other: ['otro'],

  bill: ['Factura'],
  bills: ['Factura'],
  food: ['Alimentación'],
  transportation: ['Transporte'],
  transport: ['Transporte'],
  entertainment: ['Entretenimiento'],
  loan: ['Prestamos'],
  loans: ['Prestamos'],

  alimentacion: ['Alimentación'],
  prestamo: ['Prestamos'],
  prestamos: ['Prestamos'],

  'una vez': ['una_vez']
};

function getGlobalSearchTerms(searchText) {
  const terms = [searchText];

  const normalized =
    normalizeGlobalSearchTerm(searchText);

  const aliases =
    GLOBAL_SEARCH_VALUE_ALIASES[normalized] || [];

  aliases.forEach((alias) => {
    const alreadyExists = terms.some(
      (term) =>
        normalizeGlobalSearchTerm(term) ===
        normalizeGlobalSearchTerm(alias)
    );

    if (!alreadyExists) {
      terms.push(alias);
    }
  });

  return terms;
}

function getGlobalSearchModuleTargets(normalizedSearchText) {
  const targets = {
    reminders: false,
    expenses: false,
    monthlyIncomes: false,
    additionalIncomes: false,
    documents: false
  };

  const activityTerms = new Set([
    'actividad',
    'actividades',
    'activity',
    'activities',
    'recordatorio',
    'recordatorios',
    'reminder',
    'reminders',
    'tarea',
    'tareas',
    'task',
    'tasks'
  ]);

  const expenseTerms = new Set([
    'gasto',
    'gastos',
    'expense',
    'expenses'
  ]);

  const incomeTerms = new Set([
    'ingreso',
    'ingresos',
    'income',
    'incomes'
  ]);

  const monthlyIncomeTerms = new Set([
    'ingreso mensual',
    'ingresos mensuales',
    'monthly income',
    'monthly incomes'
  ]);

  const additionalIncomeTerms = new Set([
    'ingreso adicional',
    'ingresos adicionales',
    'additional income',
    'additional incomes'
  ]);

  const documentTerms = new Set([
    'documento',
    'documentos',
    'document',
    'documents'
  ]);

  const movementTerms = new Set([
    'movimiento',
    'movimientos',
    'movement',
    'movements'
  ]);

  if (activityTerms.has(normalizedSearchText)) {
    targets.reminders = true;
  }

  if (expenseTerms.has(normalizedSearchText)) {
    targets.expenses = true;
  }

  if (incomeTerms.has(normalizedSearchText)) {
    targets.monthlyIncomes = true;
    targets.additionalIncomes = true;
  }

  if (monthlyIncomeTerms.has(normalizedSearchText)) {
    targets.monthlyIncomes = true;
  }

  if (additionalIncomeTerms.has(normalizedSearchText)) {
    targets.additionalIncomes = true;
  }

  if (documentTerms.has(normalizedSearchText)) {
    targets.documents = true;
  }

  if (movementTerms.has(normalizedSearchText)) {
    targets.expenses = true;
    targets.monthlyIncomes = true;
    targets.additionalIncomes = true;
  }

  return targets;
}

function getModuleSearchTerms(searchTerms, includeAll) {
  const terms =
    includeAll
      ? ['', ...searchTerms]
      : [...searchTerms];

  return terms.filter(
    (term, index, array) =>
      array.findIndex(
        (candidate) =>
          normalizeGlobalSearchTerm(candidate) ===
          normalizeGlobalSearchTerm(term)
      ) === index
  );
}

function buildSearchParams(userId, term, fieldCount) {
  const searchLike = `%${term}%`;

  return [
    userId,
    ...Array(fieldCount).fill(searchLike)
  ];
}

function mergeUniqueSearchResults(groups, limit = 10) {
  const unique = new Map();

  groups.flat().forEach((result) => {
    if (!unique.has(result.id)) {
      unique.set(result.id, result);
    }
  });

  return Array.from(unique.values()).slice(0, limit);
}
// GET /api/search?q=texto
router.get('/', async (req, res) => {
  const userId = req.user.id;

  const searchText =
    String(req.query.q || '').trim();

  if (!searchText) {
    return res.status(400).json({
      mensaje:
        'Debes ingresar un texto para buscar.'
    });
  }

  const searchLike =
    `%${searchText}%`;

  try {

    // =====================================
    // ACTIVIDADES
    // =====================================

    const remindersSql = `
      SELECT
        id,
        'reminder' AS type,
        title,
        COALESCE(
          description,
          original_text
        ) AS description,
        category,
        priority,
        repeat_type,
        due_date AS date_value,
        reminder_time AS time_value,
        status,
        NULL AS amount,
        created_at
      FROM reminders
      WHERE user_id = ?
        AND (
          title LIKE ?
          OR original_text LIKE ?
          OR description LIKE ?
          OR category LIKE ?
          OR priority LIKE ?
          OR repeat_type LIKE ?
          OR status LIKE ?
          OR DATE_FORMAT(
            reminder_date,
            '%Y-%m-%d'
          ) LIKE ?
          OR DATE_FORMAT(
            reminder_date,
            '%d/%m/%Y'
          ) LIKE ?
          OR DATE_FORMAT(
            due_date,
            '%Y-%m-%d'
          ) LIKE ?
          OR DATE_FORMAT(
            due_date,
            '%d/%m/%Y'
          ) LIKE ?
        )
      ORDER BY
        COALESCE(
          due_date,
          reminder_date
        ) ASC,
        reminder_time ASC
      LIMIT 10
    `;


    // =====================================
    // GASTOS
    // =====================================

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
          OR CAST(
            amount AS CHAR
          ) LIKE ?
          OR DATE_FORMAT(
            expense_date,
            '%Y-%m-%d'
          ) LIKE ?
          OR DATE_FORMAT(
            expense_date,
            '%d/%m/%Y'
          ) LIKE ?
        )
      ORDER BY
        expense_date DESC
      LIMIT 10
    `;


    // =====================================
    // INGRESO MENSUAL
    // =====================================

    const monthlyIncomesSql = `
      SELECT
        id,
        'monthly_income' AS type,
        COALESCE(
          description,
          'Ingreso mensual'
        ) AS title,
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
          OR CAST(
            amount AS CHAR
          ) LIKE ?
        )
      ORDER BY
        month_key DESC
      LIMIT 10
    `;


    // =====================================
    // INGRESOS ADICIONALES
    // =====================================

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
          OR CAST(
            amount AS CHAR
          ) LIKE ?
          OR month_key LIKE ?
          OR DATE_FORMAT(
            income_date,
            '%Y-%m-%d'
          ) LIKE ?
          OR DATE_FORMAT(
            income_date,
            '%d/%m/%Y'
          ) LIKE ?
        )
      ORDER BY
        income_date DESC
      LIMIT 10
    `;


    // =====================================
    // DOCUMENTOS PERSONALES
    // =====================================

    const documentsSql = `
      SELECT
        id,
        'document' AS type,
        document_name AS title,
        file_name AS description,
        'Documento personal' AS category,
        file_mime_type AS source,
        updated_at AS date_value,
        NULL AS time_value,
        NULL AS status,
        NULL AS amount,
        created_at
      FROM personal_documents
      WHERE user_id = ?
        AND (
          document_name LIKE ?
          OR file_name LIKE ?
        )
      ORDER BY
        updated_at DESC,
        id DESC
      LIMIT 10
    `;


    // =====================================
    // EJECUTAR BÚSQUEDAS
    // =====================================

    const reminderTerms =
      getModuleSearchTerms(
        searchTerms,
        moduleTargets.reminders
      );

    const expenseTerms =
      getModuleSearchTerms(
        searchTerms,
        moduleTargets.expenses
      );

    const monthlyIncomeTerms =
      getModuleSearchTerms(
        searchTerms,
        moduleTargets.monthlyIncomes
      );

    const additionalIncomeTerms =
      getModuleSearchTerms(
        searchTerms,
        moduleTargets.additionalIncomes
      );

    const documentTerms =
      getModuleSearchTerms(
        searchTerms,
        moduleTargets.documents
      );

    const [
      reminderGroups,
      expenseGroups,
      monthlyIncomeGroups,
      additionalIncomeGroups,
      documentGroups
    ] = await Promise.all([

      Promise.all(
        reminderTerms.map((term) =>
          runQuery(
            remindersSql,
            buildSearchParams(
              userId,
              term,
              11
            )
          )
        )
      ),

      Promise.all(
        expenseTerms.map((term) =>
          runQuery(
            expensesSql,
            buildSearchParams(
              userId,
              term,
              6
            )
          )
        )
      ),

      Promise.all(
        monthlyIncomeTerms.map((term) =>
          runQuery(
            monthlyIncomesSql,
            buildSearchParams(
              userId,
              term,
              3
            )
          )
        )
      ),

      Promise.all(
        additionalIncomeTerms.map((term) =>
          runQuery(
            additionalIncomesSql,
            buildSearchParams(
              userId,
              term,
              6
            )
          )
        )
      ),

      Promise.all(
        documentTerms.map((term) =>
          runQuery(
            documentsSql,
            buildSearchParams(
              userId,
              term,
              2
            )
          )
        )
      )
    ]);

    const reminders =
      mergeUniqueSearchResults(
        reminderGroups
      );

    const expenses =
      mergeUniqueSearchResults(
        expenseGroups
      );

    const monthlyIncomes =
      mergeUniqueSearchResults(
        monthlyIncomeGroups
      );

    const additionalIncomes =
      mergeUniqueSearchResults(
        additionalIncomeGroups
      );

    const documents =
      mergeUniqueSearchResults(
        documentGroups
      );

    // =====================================
    // UNIFICAR RESULTADOS
    // =====================================

    const results = [
      ...reminders,
      ...expenses,
      ...monthlyIncomes,
      ...additionalIncomes,
      ...documents
    ];


    return res.json({
      query: searchText,

      total:
        results.length,

      resultsByType: {
        reminders,
        expenses,
        monthlyIncomes,
        additionalIncomes,
        documents
      },

      results
    });

  } catch (error) {
    console.error(
      'Error en buscador global:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Ocurrió un error al realizar la búsqueda global.'
    });
  }
});

module.exports = router;