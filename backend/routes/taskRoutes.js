// Importamos Express para crear rutas
const express = require('express');

// Importamos la conexión a MySQL
const connection = require('../db/connection');

// Importamos el middleware de autenticación
const authMiddleware = require('../middlewares/authMiddleware');

// Creamos el router de Express
const router = express.Router();


// Ruta de prueba
// Sirve para validar que las rutas de tareas están conectadas con server.js
// Esta ruta queda pública porque solo confirma que el módulo responde
router.get('/test', (req, res) => {
  res.json({
    mensaje: '✅ Ruta de tareas funcionando correctamente'
  });
});


// A partir de aquí, todas las rutas de tareas requieren token
router.use(authMiddleware);


// Ruta para consultar las tareas del usuario autenticado
// GET http://localhost:3000/api/tasks
router.get('/', (req, res) => {
  const userId = req.user.id;

  // Primero eliminamos automáticamente las tareas completadas con más de 10 días
  const deleteOldCompletedTasksSql = `
    DELETE FROM tasks
    WHERE user_id = ?
    AND status = 'completada'
    AND completed_at IS NOT NULL
    AND completed_at < DATE_SUB(NOW(), INTERVAL 10 DAY)
  `;

  connection.query(deleteOldCompletedTasksSql, [userId], (deleteErr) => {
    if (deleteErr) {
      console.error('❌ Error al eliminar tareas completadas antiguas:', deleteErr);

      return res.status(500).json({
        mensaje: 'Error al depurar tareas completadas antiguas'
      });
    }

    const sql = `
      SELECT 
        id,
        user_id,
        title,
        description,
        category,
        priority,
        due_date,
        status,
        completed_at,
        created_at,
        updated_at
      FROM tasks
      WHERE user_id = ?
      ORDER BY due_date ASC, id DESC
    `;

    connection.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('❌ Error al consultar tareas:', err);

        return res.status(500).json({
          mensaje: 'Error al consultar las tareas'
        });
      }

      res.json({
        mensaje: 'Tareas consultadas correctamente',
        tareas: results
      });
    });
  });
});


// Ruta para crear una tarea del usuario autenticado
// POST http://localhost:3000/api/tasks
router.post('/', (req, res) => {
  const userId = req.user.id;

  const {
    title,
    description,
    category,
    priority,
    due_date,
    status
  } = req.body;

  if (!title || !category || !priority || !due_date) {
    return res.status(400).json({
      mensaje: 'Faltan datos obligatorios para registrar la tarea'
    });
  }

  const sql = `
    INSERT INTO tasks (
      user_id,
      title,
      description,
      category,
      priority,
      due_date,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    title,
    description || null,
    category,
    priority || 'Media',
    due_date,
    status || 'pendiente'
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error al registrar tarea:', err);

      return res.status(500).json({
        mensaje: 'Error al registrar la tarea'
      });
    }

    res.status(201).json({
      mensaje: 'Tarea registrada correctamente',
      tareaId: result.insertId
    });
  });
});


// Ruta para editar una tarea existente del usuario autenticado
// También sirve para cambiar el estado a completada o pendiente
// PUT http://localhost:3000/api/tasks/3
router.put('/:id', (req, res) => {
  const userId = req.user.id;
  const taskId = req.params.id;

  const {
    title,
    description,
    category,
    priority,
    due_date,
    status
  } = req.body;

  if (!title || !category || !priority || !due_date || !status) {
    return res.status(400).json({
      mensaje: 'Faltan datos obligatorios para actualizar la tarea'
    });
  }

  const sql = `
    UPDATE tasks
    SET
      title = ?,
      description = ?,
      category = ?,
      priority = ?,
      due_date = ?,
      status = ?,
      completed_at = CASE
        WHEN ? = 'completada' AND completed_at IS NULL THEN NOW()
        WHEN ? = 'pendiente' THEN NULL
        ELSE completed_at
      END
    WHERE id = ? AND user_id = ?
  `;

  const values = [
    title,
    description || null,
    category,
    priority,
    due_date,
    status,
    status,
    status,
    taskId,
    userId
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar tarea:', err);

      return res.status(500).json({
        mensaje: 'Error al actualizar la tarea'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró la tarea para actualizar'
      });
    }

    res.json({
      mensaje: 'Tarea actualizada correctamente'
    });
  });
});


// Ruta para eliminar una tarea del usuario autenticado
// DELETE http://localhost:3000/api/tasks/3
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const taskId = req.params.id;

  const sql = `
    DELETE FROM tasks
    WHERE id = ? AND user_id = ?
  `;

  connection.query(sql, [taskId, userId], (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar tarea:', err);

      return res.status(500).json({
        mensaje: 'Error al eliminar la tarea'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró la tarea para eliminar'
      });
    }

    res.json({
      mensaje: 'Tarea eliminada correctamente'
    });
  });
});


// Exportamos el router para poder usarlo en server.js
module.exports = router;