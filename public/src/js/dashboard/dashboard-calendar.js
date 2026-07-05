// ===============================
// Sesión y seguridad para recordatorios/calendario
// ===============================

function logout() {
  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");
  window.location.href = "login_google.html";
}

function getDashboardReminderAuthToken() {
  return localStorage.getItem("authToken");
}

function getDashboardReminderAuthHeaders(includeJsonContent = false) {
  const token = getDashboardReminderAuthToken();

  const headers = {
    Authorization: `Bearer ${token}`
  };

  if (includeJsonContent) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function handleDashboardReminderUnauthorizedSession(data) {
  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");

  const message = data?.error || data?.mensaje || "Tu sesión venció o no es válida. Inicia sesión nuevamente.";

  if (typeof Swal !== "undefined") {
    await Swal.fire({
      title: "Sesión vencida",
      text: message,
      icon: "warning",
      confirmButtonColor: "#960018"
    });
  } else {
    alert(message);
  }

  window.location.href = "login_google.html";
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function loadAlertedReminderKeys() {
  if (!currentUserId) {
    return;
  }

  const savedKeys = localStorage.getItem(`alertedReminderKeys_${currentUserId}`);

  if (!savedKeys) {
    alertedReminderKeys = new Set();
    return;
  }

  try {
    const parsedKeys = JSON.parse(savedKeys);
    alertedReminderKeys = new Set(parsedKeys);
  } catch (error) {
    console.error("Error al leer recordatorios alertados:", error);
    alertedReminderKeys = new Set();
  }
}

function saveAlertedReminderKeys() {
  if (!currentUserId) {
    return;
  }

  localStorage.setItem(
    `alertedReminderKeys_${currentUserId}`,
    JSON.stringify([...alertedReminderKeys])
  );
}

function getReminderAlertKey(reminder) {
  return `${reminder.id}-${getReminderDateValue(reminder.reminder_date)}-${reminder.reminder_time || "sin-hora"}`;
}

function getReminderDueDateTime(reminder) {
  const reminderDate = getReminderDateValue(reminder.reminder_date);

  if (!reminderDate || !reminder.reminder_time) {
    return null;
  }

  const [hour, minute] = reminder.reminder_time.split(":");

  return new Date(
    `${reminderDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`
  );
}

function shouldShowReminderAlert(reminder) {
  if (reminder.status !== "activo") {
    return false;
  }

  const dueDateTime = getReminderDueDateTime(reminder);

  if (!dueDateTime) {
    return false;
  }

  const alertKey = getReminderAlertKey(reminder);

  if (alertedReminderKeys.has(alertKey)) {
    return false;
  }

  const now = new Date();
  const differenceInMilliseconds = now - dueDateTime;

  const oneHourInMilliseconds = 60 * 60 * 1000;

  return differenceInMilliseconds >= 0 && differenceInMilliseconds <= oneHourInMilliseconds;
}

function startReminderAlertChecker() {
  if (reminderAlertInterval) {
    clearInterval(reminderAlertInterval);
  }

  checkDueReminderAlerts();

  reminderAlertInterval = setInterval(async () => {
    await refreshRemindersForAlerts();
    checkDueReminderAlerts();
  }, 30000);
}

async function refreshRemindersForAlerts() {
  const token = getDashboardReminderAuthToken();

  if (!token) {
    await handleDashboardReminderUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(REMINDERS_API_URL, {
      headers: getDashboardReminderAuthHeaders()
    });

    const data = await parseJsonResponse(response);

    if (response.status === 401) {
      await handleDashboardReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      console.error("No se pudieron actualizar los recordatorios para alertas:", data);
      return;
    }

    reminders = data.reminders || [];

    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();

  } catch (error) {
    console.error("Error al actualizar recordatorios para alertas:", error);
  }
}

function checkDueReminderAlerts() {
  if (reminderAlertOpen) {
    return;
  }

  const dueReminder = reminders.find((reminder) => {
    return shouldShowReminderAlert(reminder);
  });

  if (!dueReminder) {
    return;
  }

  showReminderAlert(dueReminder);
}

async function showReminderAlert(reminder) {
  reminderAlertOpen = true;

  const alertKey = getReminderAlertKey(reminder);
  alertedReminderKeys.add(alertKey);
  saveAlertedReminderKeys();

  playReminderSound();
  showBrowserReminderNotification(reminder);

  const result = await Swal.fire({
    html: `
      <div class="reminder-alert-card">
        <div class="reminder-alert-icon">
          <i class="fa-solid fa-bell"></i>
        </div>

        <span class="reminder-alert-label">
          Recordatorio
        </span>

        <h2>${reminder.title}</h2>

        <p>${reminder.original_text}</p>

        <div class="reminder-alert-meta">
          <span>
            <i class="fa-solid fa-calendar-day"></i>
            ${formatReminderDateLabel(reminder.reminder_date)}
          </span>

          <span>
            <i class="fa-solid fa-clock"></i>
            ${formatReminderTime(reminder.reminder_time)}
          </span>

          <span>
            <i class="fa-solid fa-tag"></i>
            ${reminder.category || "Personal"}
          </span>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Completar",
    cancelButtonText: "Cerrar",
    buttonsStyling: false,
    customClass: {
      popup: "reminder-swal-popup",
      htmlContainer: "reminder-swal-html",
      actions: "reminder-swal-actions",
      confirmButton: "reminder-swal-confirm",
      cancelButton: "reminder-swal-cancel"
    }
  });

  reminderAlertOpen = false;

  if (result.isConfirmed) {
    await completeReminderFromAlert(reminder);
  }
}

async function completeReminderFromAlert(reminder) {
  await completeReminder(reminder, false);
}

async function enableReminderAlerts() {
  unlockReminderSound();

  const isMobileApp =
    typeof window.isDanyBotMobileApp === "function"
      ? await window.isDanyBotMobileApp()
      : false;

  if (isMobileApp) {
    if (typeof window.testDanyBotLocalNotification !== "function") {
      Swal.fire({
        title: "Notificaciones móviles no disponibles",
        text: "No se encontró la configuración de notificaciones nativas.",
        icon: "warning",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await window.testDanyBotLocalNotification();
    return;
  }

  if (!("Notification" in window)) {
    await Swal.fire({
      title: "Notificaciones no compatibles",
      text: "Tu navegador no permite notificaciones de escritorio.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  if (Notification.permission === "granted") {
    browserNotificationsEnabled = true;

    Swal.fire({
      title: "Alertas activadas",
      text: "Ya tienes sonido y notificaciones activadas para tus recordatorios.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

    return;
  }

  if (Notification.permission === "denied") {
    Swal.fire({
      title: "Notificaciones bloqueadas",
      text: "El navegador tiene bloqueadas las notificaciones. Debes habilitarlas desde la configuración del sitio.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });

    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    browserNotificationsEnabled = true;

    Swal.fire({
      title: "Alertas activadas",
      text: "Ahora tus recordatorios podrán mostrar sonido y notificación.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

    return;
  }

  Swal.fire({
    title: "Permiso no concedido",
    text: "Sin permiso del navegador, solo se mostrará la alerta dentro de la app.",
    icon: "info",
    confirmButtonColor: "#960018"
  });
}

function unlockReminderSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    if (!reminderAudioContext) {
      reminderAudioContext = new AudioContext();
    }

    if (reminderAudioContext.state === "suspended") {
      reminderAudioContext.resume();
    }

    playReminderSound();

  } catch (error) {
    console.error("No se pudo activar el sonido:", error);
  }
}

function playReminderSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    if (!reminderAudioContext) {
      reminderAudioContext = new AudioContext();
    }

    if (reminderAudioContext.state === "suspended") {
      reminderAudioContext.resume();
    }

    playBeepTone(980, 0);
    playBeepTone(780, 0.28);
    playBeepTone(980, 0.56);

  } catch (error) {
    console.error("No se pudo reproducir el sonido:", error);
  }
}

function playBeepTone(frequency, delay) {
  try {
    if (!reminderAudioContext) {
      return;
    }

    const oscillator = reminderAudioContext.createOscillator();
    const gain = reminderAudioContext.createGain();

    oscillator.type = "square";

    oscillator.frequency.setValueAtTime(
      frequency,
      reminderAudioContext.currentTime + delay
    );

    gain.gain.setValueAtTime(
      0.001,
      reminderAudioContext.currentTime + delay
    );

    gain.gain.exponentialRampToValueAtTime(
      0.75,
      reminderAudioContext.currentTime + delay + 0.03
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      reminderAudioContext.currentTime + delay + 0.25
    );

    oscillator.connect(gain);
    gain.connect(reminderAudioContext.destination);

    oscillator.start(reminderAudioContext.currentTime + delay);
    oscillator.stop(reminderAudioContext.currentTime + delay + 0.28);

  } catch (error) {
    console.error("No se pudo ejecutar el tono:", error);
  }
}

function showBrowserReminderNotification(reminder) {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  new Notification("Agenda Personal Inteligente", {
  body: `${reminder.title} · ${formatReminderTime(reminder.reminder_time)}`,
  icon: "./src/img/danybot.png",
  tag: `reminder-${reminder.id}`,
  requireInteraction: true,
  silent: false
});
}

function shouldShowReminderInCalendar(reminder) {
  const status = String(reminder.status || "").toLowerCase();

  return status === "activo";
}

function renderCalendarSection() {
  const contentEl = document.getElementById("section-content");

  contentEl.innerHTML = `
    <div class="calendar-section">
      <div class="calendar-header">
        <div>
          <span class="welcome-badge">Calendario interno</span>
          <h2>Tu agenda del mes</h2>
          <p>
            Aquí verás tus recordatorios organizados por fecha.
          </p>
        </div>
      </div>

      <div class="calendar-layout">
        <div class="calendar-panel">
          <div class="calendar-toolbar">
            <button type="button" id="previousMonthButton" class="calendar-nav-button">
              <i class="fa-solid fa-chevron-left"></i>
            </button>

            <div class="calendar-toolbar-center">
              <h3 id="calendarMonthTitle">Mes</h3>

              <button type="button" id="todayCalendarButton" class="calendar-today-button">
                Hoy
              </button>
            </div>

            <button type="button" id="nextMonthButton" class="calendar-nav-button">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div class="calendar-weekdays">
            <span>Dom</span>
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
          </div>

          <div id="calendarGrid" class="calendar-grid"></div>
        </div>

        <div class="calendar-events-panel">
          <div class="calendar-events-heading">
            <div>
              <h3 id="calendarEventsTitle">Eventos del mes</h3>
              <p id="calendarEventsSubtitle">Selecciona un día para ver sus avisos.</p>
            </div>

            <button type="button" id="showMonthEventsButton" class="show-month-events-button">
              Ver mes
            </button>
          </div>

          <div id="calendarEventsList" class="calendar-events-list">
            <p class="empty-calendar-events">
              No hay recordatorios para este mes.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  const previousButton = document.getElementById("previousMonthButton");
  const nextButton = document.getElementById("nextMonthButton");
  const todayButton = document.getElementById("todayCalendarButton");
  const showMonthButton = document.getElementById("showMonthEventsButton");

  if (previousButton) {
    previousButton.addEventListener("click", () => {
      currentCalendarDate = new Date(
        currentCalendarDate.getFullYear(),
        currentCalendarDate.getMonth() - 1,
        1
      );

      selectedCalendarDate = null;
      renderCalendarView();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      currentCalendarDate = new Date(
        currentCalendarDate.getFullYear(),
        currentCalendarDate.getMonth() + 1,
        1
      );

      selectedCalendarDate = null;
      renderCalendarView();
    });
  }

  if (todayButton) {
    todayButton.addEventListener("click", () => {
      currentCalendarDate = new Date();
      selectedCalendarDate = getTodayDate();
      renderCalendarView();
    });
  }

  if (showMonthButton) {
    showMonthButton.addEventListener("click", () => {
      selectedCalendarDate = null;
      renderCalendarView();
    });
  }

  loadCalendarReminders();
}

async function loadCalendarReminders() {
  const token = getDashboardReminderAuthToken();

  if (!token) {
    await handleDashboardReminderUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(REMINDERS_API_URL, {
      headers: getDashboardReminderAuthHeaders()
    });

    const data = await parseJsonResponse(response);

    if (response.status === 401) {
      await handleDashboardReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo cargar el calendario",
        text: data.mensaje || "No se pudieron consultar los recordatorios.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    reminders = data.reminders || [];

    renderCalendarView();
    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();

  } catch (error) {
    console.error("Error al cargar calendario:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al cargar el calendario.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function renderCalendarView() {
  renderCalendarGrid();
  renderCalendarEventsList();
}

function renderCalendarGrid() {
  const calendarGrid = document.getElementById("calendarGrid");
  const calendarMonthTitle = document.getElementById("calendarMonthTitle");

  if (!calendarGrid || !calendarMonthTitle) {
    return;
  }

  calendarGrid.innerHTML = "";

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const monthName = currentCalendarDate.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric"
  });

  calendarMonthTitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const firstDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.classList.add("calendar-day", "calendar-day-empty");
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateForDatabase(date);
    const dayReminders = getRemindersByDate(dateKey);

    const dayCell = document.createElement("button");
    dayCell.type = "button";
    dayCell.classList.add("calendar-day");

    if (dateKey === getTodayDate()) {
      dayCell.classList.add("calendar-day-today");
    }

    if (dateKey === selectedCalendarDate) {
      dayCell.classList.add("calendar-day-selected");
    }

    if (dayReminders.length > 0) {
      dayCell.classList.add("calendar-day-has-events");
    }

    dayCell.innerHTML = `
      <span class="calendar-day-number">${day}</span>
      ${renderCalendarDayIndicators(dayReminders)}
    `;

    dayCell.addEventListener("click", () => {
      selectedCalendarDate = dateKey;
      renderCalendarView();
    });

    calendarGrid.appendChild(dayCell);
  }
}

function renderCalendarEventsList() {
  const list = document.getElementById("calendarEventsList");
  const title = document.getElementById("calendarEventsTitle");
  const subtitle = document.getElementById("calendarEventsSubtitle");

  if (!list) {
    return;
  }

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  let filteredReminders = reminders.filter((reminder) => {
    if (!shouldShowReminderInCalendar(reminder)) {
      return false;
    }

    const reminderDate = getReminderDateValue(reminder.reminder_date);
    const date = new Date(`${reminderDate}T00:00:00`);

    return date.getFullYear() === year && date.getMonth() === month;
  });

  if (selectedCalendarDate) {
    filteredReminders = filteredReminders.filter((reminder) => {
      return getReminderDateValue(reminder.reminder_date) === selectedCalendarDate;
    });
  }

  filteredReminders = filteredReminders.sort((a, b) => {
    const dateA = `${getReminderDateValue(a.reminder_date)} ${a.reminder_time || "00:00:00"}`;
    const dateB = `${getReminderDateValue(b.reminder_date)} ${b.reminder_time || "00:00:00"}`;

    return dateA.localeCompare(dateB);
  });

  if (title) {
    title.textContent = selectedCalendarDate ? "Eventos del día" : "Eventos del mes";
  }

  if (subtitle) {
    subtitle.textContent = selectedCalendarDate
      ? formatReminderDateLabel(selectedCalendarDate)
      : `${filteredReminders.length} aviso(s) programado(s) este mes.`;
  }

  if (filteredReminders.length === 0) {
    list.innerHTML = `
      <p class="empty-calendar-events">
        ${
          selectedCalendarDate
            ? "No hay recordatorios para este día."
            : "No hay recordatorios para este mes."
        }
      </p>
    `;
    return;
  }

  list.innerHTML = "";

  filteredReminders.forEach((reminder) => {
    const eventCard = document.createElement("div");
    eventCard.classList.add("calendar-event-card", getCalendarEventCategoryClass(reminder.category));

    eventCard.innerHTML = `
      <div class="calendar-event-date">
        <strong>${formatCalendarDay(getReminderDateValue(reminder.reminder_date))}</strong>
        <span>${formatCalendarMonth(getReminderDateValue(reminder.reminder_date))}</span>
      </div>

      <div class="calendar-event-info">
        <span class="calendar-event-category">
          <i class="fa-solid ${getReminderCategoryIcon(reminder.category)}"></i>
          ${reminder.category || "Personal"}
        </span>

        <h4>${reminder.title}</h4>
        <p>${reminder.original_text}</p>

        <div class="calendar-event-meta">
          <span>
            <i class="fa-solid fa-clock"></i>
            ${formatReminderTime(reminder.reminder_time)}
          </span>

          <span class="repeat-type-pill ${getRepeatTypeClass(reminder.repeat_type)}">
            <i class="fa-solid ${getRepeatTypeIcon(reminder.repeat_type)}"></i>
            ${formatRepeatType(reminder.repeat_type)}
          </span>
        </div>
      </div>
    `;

    list.appendChild(eventCard);
  });
}

function renderCalendarDayIndicators(dayReminders) {
  if (dayReminders.length === 0) {
    return "";
  }

  const dots = dayReminders.slice(0, 3).map((reminder) => {
    return `<span class="calendar-event-dot ${getCalendarDotCategoryClass(reminder.category)}"></span>`;
  }).join("");

  const extraCount = dayReminders.length > 3
    ? `<em>+${dayReminders.length - 3}</em>`
    : "";

  return `
    <div class="calendar-day-indicators">
      <strong>${dayReminders.length}</strong>
      <div class="calendar-day-dots">
        ${dots}
        ${extraCount}
      </div>
    </div>
  `;
}

function getCalendarDotCategoryClass(category) {
  const cleanCategory = normalizeText(category || "personal");

  if (cleanCategory === "finanzas") {
    return "calendar-dot-finanzas";
  }

  if (cleanCategory === "estudio") {
    return "calendar-dot-estudio";
  }

  if (cleanCategory === "trabajo") {
    return "calendar-dot-trabajo";
  }

  if (cleanCategory === "salud") {
    return "calendar-dot-salud";
  }

  return "calendar-dot-personal";
}

function getCalendarEventCategoryClass(category) {
  const cleanCategory = normalizeText(category || "personal");

  if (cleanCategory === "finanzas") {
    return "calendar-event-finanzas";
  }

  if (cleanCategory === "estudio") {
    return "calendar-event-estudio";
  }

  if (cleanCategory === "trabajo") {
    return "calendar-event-trabajo";
  }

  if (cleanCategory === "salud") {
    return "calendar-event-salud";
  }

  return "calendar-event-personal";
}

function getRemindersByDate(dateKey) {
  return reminders.filter((reminder) => {
    return shouldShowReminderInCalendar(reminder)
      && getReminderDateValue(reminder.reminder_date) === dateKey;
  });
}

function formatCalendarDay(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return String(date.getDate()).padStart(2, "0");
}

function formatCalendarMonth(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);

  return date.toLocaleDateString("es-CO", {
    month: "short"
  }).replace(".", "");
}

