const express = require('express');
const connection = require('../db/connection');

const router = express.Router();


// Limpia automáticamente recordatorios en papelera con más de 30 días
function cleanOldTrashReminders() {
  const sql = `
    DELETE FROM reminders
    WHERE status = 'papelera'
    AND deleted_at IS NOT NULL
    AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
  `;

  connection.query(sql, (error) => {
    if (error) {
      console.error('Error al limpiar papelera de recordatorios:', error);
    }
  });
}


// Ruta de prueba
// GET http://localhost:3000/api/reminders/test
router.get('/test', (req, res) => {
  res.json({
    mensaje: 'Ruta de recordatorios funcionando correctamente'
  });
});


// Consultar recordatorios de un usuario
// GET http://localhost:3000/api/reminders?user_id=4
router.get('/', (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      mensaje: 'El user_id es obligatorio'
    });
  }

  cleanOldTrashReminders();

  const sql = `
    SELECT
      id,
      user_id,
      title,
      original_text,
      reminder_date,
      TIME_FORMAT(reminder_time, '%H:%i:%s') AS reminder_time,
      category,
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


// Crear recordatorio
// POST http://localhost:3000/api/reminders
router.post('/', (req, res) => {
  const {
    user_id,
    title,
    original_text,
    reminder_date,
    reminder_time,
    category,
    repeat_type,
    status
  } = req.body;

  if (!user_id || !title || !original_text || !reminder_date) {
    return res.status(400).json({
      mensaje: 'El user_id, título, texto original y fecha son obligatorios'
    });
  }

  const reminderStatus = status || 'activo';

  const sql = `
    INSERT INTO reminders (
      user_id,
      title,
      original_text,
      reminder_date,
      reminder_time,
      category,
      repeat_type,
      status,
      deleted_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    user_id,
    title,
    original_text,
    reminder_date,
    reminder_time || null,
    category || 'Personal',
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


// Editar recordatorio
// PUT http://localhost:3000/api/reminders/1
router.put('/:id', (req, res) => {
  const reminderId = req.params.id;

  const {
    user_id,
    title,
    original_text,
    reminder_date,
    reminder_time,
    category,
    repeat_type,
    status
  } = req.body;

  if (!user_id || !title || !original_text || !reminder_date) {
    return res.status(400).json({
      mensaje: 'El user_id, título, texto original y fecha son obligatorios'
    });
  }

  const reminderStatus = status || 'activo';

  const sql = `
    UPDATE reminders
    SET
      title = ?,
      original_text = ?,
      reminder_date = ?,
      reminder_time = ?,
      category = ?,
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
    reminder_date,
    reminder_time || null,
    category || 'Personal',
    repeat_type || 'una_vez',
    reminderStatus,
    reminderStatus,
    reminderStatus,
    reminderId,
    user_id
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


// Enviar recordatorio a papelera
// DELETE http://localhost:3000/api/reminders/1?user_id=4
router.delete('/:id', (req, res) => {
  const reminderId = req.params.id;
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      mensaje: 'El user_id es obligatorio'
    });
  }

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


// Eliminar definitivamente recordatorio
// DELETE http://localhost:3000/api/reminders/1/permanent?user_id=4
router.delete('/:id/permanent', (req, res) => {
  const reminderId = req.params.id;
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      mensaje: 'El user_id es obligatorio'
    });
  }

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