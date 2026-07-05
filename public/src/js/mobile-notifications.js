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

  const permissionStatus = await LocalNotifications.requestPermissions();

  return {
    granted: permissionStatus.display === "granted",
    status: permissionStatus
  };
}

async function createDanyBotReminderNotificationChannel() {
  const LocalNotifications = getLocalNotificationsPlugin();

  if (!LocalNotifications || typeof LocalNotifications.createChannel !== "function") {
    return;
  }

  await LocalNotifications.createChannel({
    id: "danybot_reminders",
    name: "Recordatorios DanyBot",
    description: "Alertas de recordatorios programados",
    importance: 5,
    visibility: 1,
    lights: true,
    vibration: true
  });
}


async function scheduleDanyBotLocalNotification({ id, title, body, date }) {
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

  await createDanyBotReminderNotificationChannel();

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: {
          at: date
        },
        channelId: "danybot_reminders",
        extra: {
          source: "danybot-reminder"
        }
      }
    ]
  });

  return {
    scheduled: true
  };
}

async function testDanyBotLocalNotification() {
  const permission = await requestDanyBotNotificationPermission();

  if (!permission.granted) {
    Swal.fire({
      title: "Permiso no concedido",
      text: "No fue posible activar las notificaciones del celular.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const notificationDate = new Date(Date.now() + 60000);

  await scheduleDanyBotLocalNotification({
    id: Date.now() % 2147483647,
    title: "Agenda Personal Inteligente",
    body: "Esta es una prueba de notificación local.",
    date: notificationDate
  });

  Swal.fire({
    title: "Notificación programada",
    text: "En un minuto debería aparecer una notificación del celular, incluso si sales de la app.",
    icon: "success",
    confirmButtonColor: "#960018"
  });
}

window.requestDanyBotNotificationPermission = requestDanyBotNotificationPermission;
window.scheduleDanyBotLocalNotification = scheduleDanyBotLocalNotification;
window.testDanyBotLocalNotification = testDanyBotLocalNotification;
