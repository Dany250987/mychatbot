const express = require('express');
const connection = require('../db/connection');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();


// Limpia automáticamente recordatorios en papelera con más de 30 días
// Solo limpia la papelera del usuario autenticado
function cleanOldTrashReminders(userId, callback) {
  const sql = `
    DELETE FROM reminders
    WHERE user_id = ?
    AND status = 'papelera'
    AND deleted_at IS NOT NULL
    AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
  `;

  connection.query(sql, [userId], (error) => {
    if (error) {
      console.error('Error al limpiar papelera de recordatorios:', error);
    }

    if (typeof callback === 'function') {
      callback(error);
    }
  });
}


// Ruta de prueba
// GET http://localhost:3000/api/reminders/test
// Esta ruta queda pública porque solo confirma que el módulo responde
router.get('/test', (req, res) => {
  res.json({
    mensaje: 'Ruta de recordatorios funcionando correctamente'
  });
});


// A partir de aquí, todas las rutas de recordatorios requieren token
router.use(authMiddleware);


// Consultar recordatorios del usuario autenticado
// GET http://localhost:3000/api/reminders
router.get('/', (req, res) => {
  const userId = req.user.id;

  cleanOldTrashReminders(userId, (cleanError) => {
    if (cleanError) {
      return res.status(500).json({
        mensaje: 'Error al limpiar la papelera de recordatorios'
      });
    }

    const sql = `
      SELECT
        id,
        user_id,
        title,
        original_text,
        description,
        reminder_date,
        due_date,
        TIME_FORMAT(reminder_time, '%H:%i:%s') AS reminder_time,
        category,
        priority,
        repeat_type,
        status,
        deleted_at,
        created_at,
        updated_at
      FROM reminders
      WHERE user_id = ?
      ORDER BY reminder_date ASC, reminder_time ASC, created_at DESC
    `;

    connection.query(sql, [userId], (error, results) => {
      if (error) {
        console.error('Error al consultar recordatorios:', error);

        return res.status(500).json({
          mensaje: 'Error al consultar los recordatorios'
        });
      }

      res.json({
        mensaje: 'Recordatorios consultados correctamente',
        reminders: results
      });
    });
  });
});


// Crear recordatorio del usuario autenticado
// POST http://localhost:3000/api/reminders
router.post('/', (req, res) => {
  const userId = req.user.id;

  const {
    title,
    original_text,
    description,
    reminder_date,
    due_date,
    reminder_time,
    category,
    priority,
    repeat_type,
    status
  } = req.body;

  if (!title || !original_text || !reminder_date) {
    return res.status(400).json({
      mensaje: 'El título, texto original y fecha son obligatorios'
    });
  }

  const reminderStatus = status || 'activo';
  const reminderPriority = priority || 'media';

  const sql = `
    INSERT INTO reminders (
      user_id,
      title,
      original_text,
      description,
      reminder_date,
      due_date,
      reminder_time,
      category,
      priority,
      repeat_type,
      status,
      deleted_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    title,
    original_text,
    description || null,
    reminder_date,
    due_date || reminder_date,
    reminder_time || null,
    category || 'Personal',
    reminderPriority,
    repeat_type || 'una_vez',
    reminderStatus,
    reminderStatus === 'papelera' ? new Date() : null
  ];

  connection.query(sql, values, (error, result) => {
    if (error) {
      console.error('Error al crear recordatorio:', error);

      return res.status(500).json({
        mensaje: 'Error al crear el recordatorio'
      });
    }

    res.status(201).json({
      mensaje: 'Recordatorio creado correctamente',
      reminder_id: result.insertId
    });
  });
});


// Editar recordatorio del usuario autenticado
// PUT http://localhost:3000/api/reminders/1
router.put('/:id', (req, res) => {
  const userId = req.user.id;
  const reminderId = req.params.id;

  const {
    title,
    original_text,
    description,
    reminder_date,
    due_date,
    reminder_time,
    category,
    priority,
    repeat_type,
    status
  } = req.body;

  if (!title || !original_text || !reminder_date) {
    return res.status(400).json({
      mensaje: 'El título, texto original y fecha son obligatorios'
    });
  }

  const reminderStatus = status || 'activo';
  const reminderPriority = priority || 'media';

  const sql = `
    UPDATE reminders
    SET
      title = ?,
      original_text = ?,
      description = ?,
      reminder_date = ?,
      due_date = ?,
      reminder_time = ?,
      category = ?,
      priority = ?,
      repeat_type = ?,
      status = ?,
      deleted_at = CASE
        WHEN ? = 'papelera' AND deleted_at IS NULL THEN NOW()
        WHEN ? <> 'papelera' THEN NULL
        ELSE deleted_at
      END
    WHERE id = ?
    AND user_id = ?
  `;

  const values = [
    title,
    original_text,
    description || null,
    reminder_date,
    due_date || reminder_date,
    reminder_time || null,
    category || 'Personal',
    reminderPriority,
    repeat_type || 'una_vez',
    reminderStatus,
    reminderStatus,
    reminderStatus,
    reminderId,
    userId
  ];

  connection.query(sql, values, (error, result) => {
    if (error) {
      console.error('Error al editar recordatorio:', error);

      return res.status(500).json({
        mensaje: 'Error al editar el recordatorio'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el recordatorio para editar'
      });
    }

    res.json({
      mensaje: 'Recordatorio actualizado correctamente'
    });
  });
});


// Enviar recordatorio a papelera del usuario autenticado
// DELETE http://localhost:3000/api/reminders/1
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const reminderId = req.params.id;

  const sql = `
    UPDATE reminders
    SET 
      status = 'papelera',
      deleted_at = NOW()
    WHERE id = ?
    AND user_id = ?
  `;

  connection.query(sql, [reminderId, userId], (error, result) => {
    if (error) {
      console.error('Error al enviar recordatorio a papelera:', error);

      return res.status(500).json({
        mensaje: 'Error al enviar el recordatorio a la papelera'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el recordatorio para eliminar'
      });
    }

    res.json({
      mensaje: 'Recordatorio enviado a papelera correctamente'
    });
  });
});


// Eliminar definitivamente recordatorio del usuario autenticado
// DELETE http://localhost:3000/api/reminders/1/permanent
router.delete('/:id/permanent', (req, res) => {
  const userId = req.user.id;
  const reminderId = req.params.id;

  const sql = `
    DELETE FROM reminders
    WHERE id = ?
    AND user_id = ?
    AND status = 'papelera'
  `;

  connection.query(sql, [reminderId, userId], (error, result) => {
    if (error) {
      console.error('Error al eliminar definitivamente recordatorio:', error);

      return res.status(500).json({
        mensaje: 'Error al eliminar definitivamente el recordatorio'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el recordatorio en papelera para eliminar definitivamente'
      });
    }

    res.json({
      mensaje: 'Recordatorio eliminado definitivamente'
    });
  });
});


module.exports = router;