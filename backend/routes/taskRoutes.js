// Importamos Express para crear rutas
const express = require('express');

// Importamos la conexión a MySQL
const connection = require('../db/connection');

// Creamos el router de Express
const router = express.Router();


// Ruta de prueba
// Sirve para validar que las rutas de tareas están conectadas con server.js
router.get('/test', (req, res) => {
  res.json({
    mensaje: '✅ Ruta de tareas funcionando correctamente'
  });
});


// Ruta para consultar las tareas de un usuario
// Ejemplo:
// GET http://localhost:3000/api/tasks?user_id=4
router.get('/', (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      mensaje: 'El user_id es obligatorio para consultar las tareas'
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


// Ruta para crear una tarea
// Ejemplo:
// POST http://localhost:3000/api/tasks
router.post('/', (req, res) => {
  const {
    user_id,
    title,
    description,
    category,
    priority,
    due_date,
    status
  } = req.body;

  if (!user_id || !title || !category || !priority || !due_date) {
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
    user_id,
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


// Ruta para editar una tarea existente
// También sirve para cambiar el estado a completada o pendiente
// Ejemplo:
// PUT http://localhost:3000/api/tasks/3
router.put('/:id', (req, res) => {
  const taskId = req.params.id;

  const {
    user_id,
    title,
    description,
    category,
    priority,
    due_date,
    status
  } = req.body;

  if (!user_id || !title || !category || !priority || !due_date || !status) {
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
      status = ?
    WHERE id = ? AND user_id = ?
  `;

  const values = [
    title,
    description || null,
    category,
    priority,
    due_date,
    status,
    taskId,
    user_id
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


// Ruta para eliminar una tarea
// Ejemplo:
// DELETE http://localhost:3000/api/tasks/3?user_id=4
router.delete('/:id', (req, res) => {
  const taskId = req.params.id;
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      mensaje: 'El user_id es obligatorio para eliminar la tarea'
    });
  }

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