async function isDanyBotMobileApp() {
  return (
    window.location.origin === "http://localhost" ||
    window.location.origin === "https://localhost" ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:"
  );
}


function getLocalNotificationsPlugin() {
  if (!window.Capacitor || !window.Capacitor.Plugins) {
    return null;
  }

  return window.Capacitor.Plugins.LocalNotifications || null;
}

const DANYBOT_REMINDER_ACTION_TYPE_ID =
  "danybot_reminder_actions";

const DANYBOT_COMPLETE_REMINDER_ACTION_ID =
  "danybot_complete_reminder";

const DANYBOT_PENDING_NOTIFICATION_ACTION_KEY =
  "danybot_pending_notification_action";


function getDanyBotNotificationId(reminderId) {
  const numericId = Number(reminderId);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  return numericId % 2147483647;
}


function buildDanyBotReminderDate(reminderDate, reminderTime) {
  if (!reminderDate || !reminderTime) {
    return null;
  }

  const cleanDate = String(reminderDate).substring(0, 10);
  const cleanTime = String(reminderTime).substring(0, 5);

  const date = new Date(`${cleanDate}T${cleanTime}:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}


async function requestDanyBotNotificationPermission() {
  const isMobile = await isDanyBotMobileApp();

  if (!isMobile) {
    return {
      granted: false,
      reason: "No es app móvil"
    };
  }

  const LocalNotifications = getLocalNotificationsPlugin();
  
  if (!LocalNotifications) {
    return {
      granted: false,
      reason: "Plugin LocalNotifications no disponible"
    };
  }

  const currentPermission =
    await LocalNotifications.checkPermissions();

  if (currentPermission.display === "granted") {
    return {
      granted: true,
      status: currentPermission
    };
  }

  const permissionStatus =
    await LocalNotifications.requestPermissions();

  return {
    granted: permissionStatus.display === "granted",
    status: permissionStatus
  };
}


async function checkDanyBotExactAlarmPermission() {
  const isMobile = await isDanyBotMobileApp();

  if (!isMobile) {
    return {
      granted: false,
      reason: "No es app móvil"
    };
  }

  const LocalNotifications = getLocalNotificationsPlugin();

  if (
    !LocalNotifications ||
    typeof LocalNotifications.checkExactNotificationSetting !==
      "function"
  ) {
    return {
      granted: true,
      unsupported: true
    };
  }

  try {
    const status =
      await LocalNotifications.checkExactNotificationSetting();

    return {
      granted: status.exact_alarm === "granted",
      status
    };
  } catch (error) {
    console.error(
      "No se pudo consultar el permiso de alarmas exactas:",
      error
    );

    return {
      granted: false,
      error
    };
  }
}


async function openDanyBotExactAlarmSettings() {
  const LocalNotifications = getLocalNotificationsPlugin();

  if (
    !LocalNotifications ||
    typeof LocalNotifications.changeExactNotificationSetting !==
      "function"
  ) {
    return {
      opened: false
    };
  }

  try {
    const status =
      await LocalNotifications.changeExactNotificationSetting();

    return {
      opened: true,
      status
    };
  } catch (error) {
    console.error(
      "No se pudo abrir la configuración de alarmas exactas:",
      error
    );

    return {
      opened: false,
      error
    };
  }
}


async function createDanyBotReminderNotificationChannel() {
  const LocalNotifications = getLocalNotificationsPlugin();

  if (
    !LocalNotifications ||
    typeof LocalNotifications.createChannel !== "function"
  ) {
    return;
  }

  await LocalNotifications.createChannel({
    id: "danybot_reminders",
    name: "Recordatorios Día en Orden",
    description: "Alertas de actividades y recordatorios programados",
    importance: 5,
    visibility: 1,
    lights: true,
    vibration: true
  });
}

function saveDanyBotPendingNotificationAction(action) {
  if (!action) {
    return;
  }

  localStorage.setItem(
    DANYBOT_PENDING_NOTIFICATION_ACTION_KEY,
    JSON.stringify(action)
  );
}


function consumeDanyBotPendingNotificationAction() {
  const savedAction = localStorage.getItem(
    DANYBOT_PENDING_NOTIFICATION_ACTION_KEY
  );

  if (!savedAction) {
    return null;
  }

  localStorage.removeItem(
    DANYBOT_PENDING_NOTIFICATION_ACTION_KEY
  );

  try {
    return JSON.parse(savedAction);
  } catch (error) {
    console.error(
      "Error al leer acción pendiente de notificación:",
      error
    );

    return null;
  }
}


async function setupDanyBotNotificationActions() {
  const isMobile = await isDanyBotMobileApp();

  if (!isMobile) {
    return;
  }

  const LocalNotifications =
    getLocalNotificationsPlugin();

  if (!LocalNotifications) {
    return;
  }

  try {
    /*
     * Registramos las acciones disponibles
     * para los recordatorios de Día en Orden.
     */
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: DANYBOT_REMINDER_ACTION_TYPE_ID,
          actions: [
            {
              id: DANYBOT_COMPLETE_REMINDER_ACTION_ID,
              title: "Completar"
            }
          ]
        }
      ]
    });

    /*
     * Detectamos cuando el usuario pulsa
     * Completar directamente desde Android.
     */
    await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (notificationAction) => {
        if (
          notificationAction.actionId !==
          DANYBOT_COMPLETE_REMINDER_ACTION_ID
        ) {
          return;
        }

        const reminderId = Number(
          notificationAction.notification?.extra
            ?.reminderId
        );

        if (
          !Number.isInteger(reminderId) ||
          reminderId <= 0
        ) {
          console.warn(
            "No se encontró un reminderId válido en la notificación."
          );

          return;
        }

        const pendingAction = {
          type: "complete-reminder",
          reminderId
        };

        /*
         * Guardamos la acción porque la app podría
         * estar iniciándose y dashboard-reminders.js
         * todavía no estar disponible.
         */
        saveDanyBotPendingNotificationAction(
          pendingAction
        );

        /*
         * Abrimos la sección de actividades.
         */
        window.location.hash = "recordatorios";

        /*
         * Si la aplicación ya estaba abierta,
         * avisamos también inmediatamente.
         */
        window.dispatchEvent(
          new CustomEvent(
            "danybot:notification-action",
            {
              detail: pendingAction
            }
          )
        );
      }
    );

  } catch (error) {
    console.error(
      "Error al configurar acciones de notificaciones:",
      error
    );
  }
}


async function scheduleDanyBotLocalNotification({
  id,
  title,
  body,
  date,
  actionTypeId = null
}) {
  const isMobile = await isDanyBotMobileApp();

  if (!isMobile) {
    return {
      scheduled: false,
      reason: "No es app móvil"
    };
  }

  const LocalNotifications = getLocalNotificationsPlugin();

  if (!LocalNotifications) {
    return {
      scheduled: false,
      reason: "Plugin LocalNotifications no disponible"
    };
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return {
      scheduled: false,
      reason: "Fecha de notificación inválida"
    };
  }

  if (date.getTime() <= Date.now()) {
    return {
      scheduled: false,
      reason: "La fecha de notificación ya pasó"
    };
  }

  const notificationId = getDanyBotNotificationId(id);

  if (notificationId === null) {
    return {
      scheduled: false,
      reason: "ID de notificación inválido"
    };
  }

    const permission =
    await requestDanyBotNotificationPermission();

  if (!permission.granted) {
    return {
      scheduled: false,
      reason: "Permiso de notificaciones no concedido"
    };
  }

  /*
   * Para que Android pueda respetar la hora exacta
   * del recordatorio, comprobamos el acceso especial
   * a Alarmas y recordatorios.
   */
  const exactAlarmPermission =
    await checkDanyBotExactAlarmPermission();

  if (!exactAlarmPermission.granted) {
    return {
      scheduled: false,
      exactAlarmRequired: true,
      reason: "Debes permitir alarmas y recordatorios para recibir avisos a la hora programada."
    };
  }

  await createDanyBotReminderNotificationChannel();

  /*
   * Si ya existe una alarma con este mismo ID,
   * la cancelamos antes de volver a programarla.
   * Esto permite editar fecha/hora sin duplicar avisos.
   */
  await cancelDanyBotLocalNotification(notificationId);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: title || "Día en Orden",
        body: body || "Tienes una actividad programada.",
        schedule: {
          at: date,
          allowWhileIdle: true
        },
        channelId: "danybot_reminders",

        ...(actionTypeId
          ? { actionTypeId }
          : {}),

        extra: {
          source: "danybot-reminder",
          reminderId: id
        }
      }
    ]
  });

  return {
    scheduled: true,
    notificationId,
    date
  };
}


async function scheduleDanyBotReminderNotification(reminder) {
  if (!reminder) {
    return {
      scheduled: false,
      reason: "Recordatorio no recibido"
    };
  }

  const notificationDate =
    buildDanyBotReminderDate(
      reminder.reminder_date,
      reminder.reminder_time
    );

  if (!notificationDate) {
    return {
      scheduled: false,
      reason: "El recordatorio no tiene fecha y hora válidas"
    };
  }

  return scheduleDanyBotLocalNotification({
    id: reminder.id,
    title: "Día en Orden",
    body:
      reminder.title ||
      "Tienes una actividad programada.",
    date: notificationDate,
    actionTypeId:
      DANYBOT_REMINDER_ACTION_TYPE_ID
  });
}


async function cancelDanyBotLocalNotification(reminderId) {
  const isMobile = await isDanyBotMobileApp();

  if (!isMobile) {
    return {
      cancelled: false,
      reason: "No es app móvil"
    };
  }

  const LocalNotifications = getLocalNotificationsPlugin();

  if (!LocalNotifications) {
    return {
      cancelled: false,
      reason: "Plugin LocalNotifications no disponible"
    };
  }

  const notificationId =
    getDanyBotNotificationId(reminderId);

  if (notificationId === null) {
    return {
      cancelled: false,
      reason: "ID de notificación inválido"
    };
  }

  try {
    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId
        }
      ]
    });

    return {
      cancelled: true,
      notificationId
    };
  } catch (error) {
    console.error(
      "No se pudo cancelar la notificación local:",
      error
    );

    return {
      cancelled: false,
      error
    };
  }
}


async function getDanyBotPendingNotifications() {
  const isMobile = await isDanyBotMobileApp();

  if (!isMobile) {
    return [];
  }

  const LocalNotifications = getLocalNotificationsPlugin();

  if (!LocalNotifications) {
    return [];
  }

  try {
    const result =
      await LocalNotifications.getPending();

    return result.notifications || [];
  } catch (error) {
    console.error(
      "No se pudieron consultar las notificaciones pendientes:",
      error
    );

    return [];
  }
}


async function testDanyBotLocalNotification() {
  const permission =
    await requestDanyBotNotificationPermission();

  if (!permission.granted) {
    Swal.fire({
      title: "Permiso no concedido",
      text: "No fue posible activar las notificaciones del celular.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });

    return;
  }

  const notificationDate =
    new Date(Date.now() + 60000);

  const result =
    await scheduleDanyBotLocalNotification({
      id: Date.now() % 2147483647,
      title: "Día en Orden",
      body: "Esta es una prueba de notificación local.",
      date: notificationDate
    });

  if (!result.scheduled) {
    Swal.fire({
      title: "No se pudo programar",
      text:
        result.reason ||
        "No fue posible programar la notificación.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });

    return;
  }

  Swal.fire({
    title: "Notificación programada",
    text:
      "En un minuto debería aparecer una notificación del celular, incluso si sales de la app o bloqueas la pantalla.",
    icon: "success",
    confirmButtonColor: "#960018"
  });
}


window.isDanyBotMobileApp =
  isDanyBotMobileApp;

window.requestDanyBotNotificationPermission =
  requestDanyBotNotificationPermission;

window.checkDanyBotExactAlarmPermission =
  checkDanyBotExactAlarmPermission;

window.openDanyBotExactAlarmSettings =
  openDanyBotExactAlarmSettings;

window.scheduleDanyBotLocalNotification =
  scheduleDanyBotLocalNotification;

window.scheduleDanyBotReminderNotification =
  scheduleDanyBotReminderNotification;

window.cancelDanyBotLocalNotification =
  cancelDanyBotLocalNotification;

window.getDanyBotPendingNotifications =
  getDanyBotPendingNotifications;

window.testDanyBotLocalNotification =
  testDanyBotLocalNotification;

window.consumeDanyBotPendingNotificationAction =
  consumeDanyBotPendingNotificationAction;

window.setupDanyBotNotificationActions =
  setupDanyBotNotificationActions;


/*
 * Se registra lo antes posible para poder capturar
 * acciones incluso cuando Android abre la app
 * desde una notificación.
 */
setupDanyBotNotificationActions();