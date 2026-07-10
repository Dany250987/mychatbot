// ===============================
// Seguridad con token para recordatorios
// ===============================

function getReminderAuthToken() {
  return localStorage.getItem("authToken");
}

function getReminderAuthHeaders(includeJsonContent = false) {
  const token = getReminderAuthToken();

  const headers = {
    Authorization: `Bearer ${token}`
  };

  if (includeJsonContent) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

let hasHighlightedReminderSearchResult = false;

function getReminderSearchTarget() {
  const urlParams = new URLSearchParams(window.location.search);

  return {
    type: urlParams.get("type"),
    id: Number(urlParams.get("id")),
    status: urlParams.get("status"),
    date: urlParams.get("date")
  };
}

function isReminderSearchTarget(reminderId) {
  const target = getReminderSearchTarget();

  return target.type === "reminder" && target.id === Number(reminderId);
}

function highlightReminderSearchTargetElement(element) {
  if (!element || hasHighlightedReminderSearchResult) {
    return;
  }

  hasHighlightedReminderSearchResult = true;

  setTimeout(() => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    element.classList.add("dashboard-search-highlight");

    setTimeout(() => {
      element.classList.remove("dashboard-search-highlight");
    }, 5000);
  }, 500);
}

async function handleReminderUnauthorizedSession(data) {
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

async function loadReminders() {
  const token = getReminderAuthToken();

  if (!token) {
    await handleReminderUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(REMINDERS_API_URL, {
      headers: getReminderAuthHeaders()
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      console.error("No se pudieron consultar los recordatorios:", data);
      return;
    }

    reminders = data.reminders || [];

    renderRemindersList();
    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();

  } catch (error) {
    console.error("Error al consultar recordatorios:", error);
  }
}

function renderDetectedReminder(reminder) {
  const box = document.getElementById("detectedReminderBox");

  if (!box) {
    return;
  }

  box.style.display = "block";

  box.innerHTML = `
    <h3>Recordatorio detectado</h3>

    <div class="detected-reminder-grid">
      <div>
        <span>Título</span>
        <strong>${reminder.title}</strong>
      </div>

      <div>
        <span>Fecha</span>
        <strong>${reminder.reminder_date || "No detectada"}</strong>
      </div>

      <div>
        <span>Hora</span>
        <strong>${reminder.reminder_time || "Sin hora"}</strong>
      </div>

      <div>
        <span>Categoría</span>
        <strong>${reminder.category}</strong>
      </div>
    </div>
  `;
}

function renderReminderActions(reminder) {
  if (isReminderInTrash(reminder)) {
    return `
      <div class="reminder-actions">
        <button 
          type="button" 
          onclick="restoreReminder(${reminder.id})"
          class="reopen-reminder-button"
        >
          <i class="fa-solid fa-rotate-left"></i>
          Restaurar
        </button>

        <button 
          type="button" 
          onclick="deleteReminderPermanently(${reminder.id})" 
          class="delete-reminder-button"
        >
          <i class="fa-solid fa-trash-can"></i>
          Eliminar definitivo
        </button>
      </div>
    `;
  }

  return `
    <div class="reminder-actions">
      <button 
        type="button" 
        onclick="toggleReminderStatus(${reminder.id})"
        class="complete-reminder-button"
      >
        <i class="fa-solid fa-check"></i>
        Completar
      </button>

      <button type="button" onclick="editReminder(${reminder.id})">
        <i class="fa-solid fa-pen"></i>
        Editar
      </button>

      <button type="button" onclick="deleteReminder(${reminder.id})" class="delete-reminder-button">
        <i class="fa-solid fa-trash"></i>
        Eliminar
      </button>
    </div>
  `;
}

function renderRemindersList() {
  const list = document.getElementById("remindersList");

  if (!list) {
    return;
  }

  const sortedReminders = getFilteredReminders();

  if (sortedReminders.length === 0) {
    const emptyMessage = getEmptyRemindersMessage();

    list.innerHTML = `
      <div class="empty-reminders">
        <i class="fa-solid ${emptyMessage.icon}"></i>
        <h3>${emptyMessage.title}</h3>
        <p>${emptyMessage.text}</p>
      </div>
    `;
    return;
  }

  list.innerHTML = "";

  sortedReminders.forEach((reminder) => {
    const card = document.createElement("div");

    const categoryClass = getReminderCategoryClass(reminder.category);

    card.classList.add("reminder-timeline-card", categoryClass);
    card.classList.add(`reminder-status-${getReminderStatusClass(reminder)}`);
    card.dataset.reminderId = reminder.id;

    if (isReminderSearchTarget(reminder.id)) {
      card.classList.add("dashboard-search-target-card");
    }

    card.innerHTML = `
      <div class="reminder-date-badge">
        <strong>${formatReminderDayNumber(reminder.reminder_date)}</strong>
        <span>${formatReminderMonthShort(reminder.reminder_date)}</span>
      </div>

      <div class="reminder-content">
        <div class="reminder-top-row">
          <div>
            <span class="reminder-type-label">
              <i class="fa-solid ${getReminderCategoryIcon(reminder.category)}"></i>
              ${reminder.category || "Personal"}
            </span>

            <h3>${reminder.title}</h3>
          </div>

          <span class="reminder-status-pill ${getReminderStatusClass(reminder)}">
            ${getReminderStatusLabel(reminder)}
          </span>
        </div>

        <p>${reminder.original_text}</p>

        <div class="reminder-meta">
          <span>
            <i class="fa-solid fa-calendar-day"></i>
            ${formatReminderDateLabel(reminder.reminder_date)}
          </span>

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

      ${renderReminderActions(reminder)}
    `;

    list.appendChild(card);

    if (isReminderSearchTarget(reminder.id)) {
      highlightReminderSearchTargetElement(card);
    }
  });
}

function formatReminderDateLabel(dateValue) {
  const date = new Date(`${getReminderDateValue(dateValue)}T00:00:00`);

  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).replace(".", "");
}

function formatReminderDayNumber(dateValue) {
  const date = new Date(`${getReminderDateValue(dateValue)}T00:00:00`);

  return String(date.getDate()).padStart(2, "0");
}

function formatReminderMonthShort(dateValue) {
  const date = new Date(`${getReminderDateValue(dateValue)}T00:00:00`);

  return date.toLocaleDateString("es-CO", {
    month: "short"
  }).replace(".", "");
}

function getReminderCategoryClass(category) {
  const cleanCategory = normalizeText(category || "personal");

  if (cleanCategory === "finanzas") {
    return "reminder-finanzas";
  }

  if (cleanCategory === "estudio") {
    return "reminder-estudio";
  }

  if (cleanCategory === "trabajo") {
    return "reminder-trabajo";
  }

  if (cleanCategory === "salud") {
    return "reminder-salud";
  }

  return "reminder-personal";
}

function getReminderCategoryIcon(category) {
  const cleanCategory = normalizeText(category || "personal");

  if (cleanCategory === "finanzas") {
    return "fa-wallet";
  }

  if (cleanCategory === "estudio") {
    return "fa-book-open";
  }

  if (cleanCategory === "trabajo") {
    return "fa-briefcase";
  }

  if (cleanCategory === "salud") {
    return "fa-heart-pulse";
  }

  return "fa-bell";
}

function isReminderToday(reminder) {
  return getReminderDateValue(reminder.reminder_date) === getTodayDate();
}

function isReminderOverdue(reminder) {
  if (reminder.status === "completado") {
    return false;
  }

  const today = getTodayDate();
  const reminderDate = getReminderDateValue(reminder.reminder_date);

  if (reminderDate < today) {
    return true;
  }

  if (reminderDate > today) {
    return false;
  }

  if (!reminder.reminder_time) {
    return false;
  }

  const now = new Date();
  const [hour, minute] = reminder.reminder_time.split(":");

  const reminderDateTime = new Date();
  reminderDateTime.setHours(Number(hour));
  reminderDateTime.setMinutes(Number(minute));
  reminderDateTime.setSeconds(0);

  return reminderDateTime < now;
}

function getReminderStatusLabel(reminder) {
  if (isReminderInTrash(reminder)) {
    return "Papelera";
  }

  if (isReminderOverdue(reminder)) {
    return "Vencido";
  }

  if (isReminderToday(reminder)) {
    return "Hoy";
  }

  return "Activo";
}

function getReminderStatusClass(reminder) {
  if (isReminderInTrash(reminder)) {
    return "trash";
  }

  if (isReminderOverdue(reminder)) {
    return "overdue";
  }

  if (isReminderToday(reminder)) {
    return "today";
  }

  return "active";
}

function getReminderById(reminderId) {
  return reminders.find((reminder) => reminder.id === reminderId);
}



async function editReminder(reminderId) {
  const reminder = getReminderById(reminderId);

  if (!reminder) {
    Swal.fire({
      title: "Recordatorio no encontrado",
      text: "No se encontró el recordatorio para editar.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const result = await Swal.fire({
    title: "Editar recordatorio",
    html: `
      <div class="reminder-edit-modal">
        <label for="editReminderTitle">Título</label>
        <input 
          id="editReminderTitle" 
          class="swal2-input" 
          value="${reminder.title || ""}"
        >

        <label for="editReminderDate">Fecha</label>
        <input 
          id="editReminderDate" 
          type="date" 
          class="swal2-input" 
          value="${getReminderDateValue(reminder.reminder_date)}"
        >

        <label for="editReminderTime">Hora</label>
        <input 
          id="editReminderTime" 
          type="time" 
          class="swal2-input" 
          value="${reminder.reminder_time ? reminder.reminder_time.substring(0, 5) : ""}"
        >

        <label for="editReminderCategory">Categoría</label>
        <select id="editReminderCategory" class="swal2-input">
          <option value="Personal" ${reminder.category === "Personal" ? "selected" : ""}>Personal</option>
          <option value="Finanzas" ${reminder.category === "Finanzas" ? "selected" : ""}>Finanzas</option>
          <option value="Estudio" ${reminder.category === "Estudio" ? "selected" : ""}>Estudio</option>
          <option value="Trabajo" ${reminder.category === "Trabajo" ? "selected" : ""}>Trabajo</option>
          <option value="Salud" ${reminder.category === "Salud" ? "selected" : ""}>Salud</option>
        </select>

        <label for="editReminderRepeat">Repetición</label>
        <select id="editReminderRepeat" class="swal2-input">
          <option value="una_vez" ${reminder.repeat_type === "una_vez" ? "selected" : ""}>Una vez</option>
          <option value="diario" ${reminder.repeat_type === "diario" ? "selected" : ""}>Diario</option>
          <option value="semanal" ${reminder.repeat_type === "semanal" ? "selected" : ""}>Semanal</option>
          <option value="mensual" ${reminder.repeat_type === "mensual" ? "selected" : ""}>Mensual</option>
          <option value="anual" ${reminder.repeat_type === "anual" ? "selected" : ""}>Anual</option>
        </select>

        <label for="editReminderStatus">Estado</label>
        <select id="editReminderStatus" class="swal2-input">
          <option value="activo" ${reminder.status === "activo" ? "selected" : ""}>Activo</option>
          <option value="completado" ${reminder.status === "completado" ? "selected" : ""}>Completado</option>
        </select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Guardar cambios",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#960018",
    cancelButtonColor: "#6b7280",
    focusConfirm: false,
    preConfirm: () => {
      const title = document.getElementById("editReminderTitle").value.trim();
      const reminderDate = document.getElementById("editReminderDate").value;
      const reminderTime = document.getElementById("editReminderTime").value;
      const category = document.getElementById("editReminderCategory").value;
      const repeatType = document.getElementById("editReminderRepeat").value;
      const status = document.getElementById("editReminderStatus").value;

      if (!title || !reminderDate) {
        Swal.showValidationMessage("El título y la fecha son obligatorios.");
        return false;
      }

     return {
      title,
      original_text: reminder.original_text || title,
      reminder_date: reminderDate,
      reminder_time: reminderTime ? `${reminderTime}:00` : null,
      category,
      repeat_type: repeatType,
      status
    };
    }
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(`${REMINDERS_API_URL}/${reminderId}`, {
      method: "PUT",
      headers: getReminderAuthHeaders(true),
      body: JSON.stringify(result.value)
    });

    const data = await response.json();
    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo actualizar",
        text: data.mensaje || "No se pudo actualizar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await loadReminders();

    Swal.fire({
      title: "Recordatorio actualizado",
      text: "Los cambios fueron guardados correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

  } catch (error) {
    console.error("Error al editar recordatorio:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al editar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

async function deleteReminder(reminderId) {
  const result = await Swal.fire({
    title: "¿Eliminar recordatorio?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#960018",
    cancelButtonColor: "#6b7280"
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(`${REMINDERS_API_URL}/${reminderId}`, {
      method: "DELETE",
      headers: getReminderAuthHeaders()
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo eliminar",
        text: data.mensaje || "No se pudo eliminar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await loadReminders();

    Swal.fire({
      title: "Recordatorio eliminado",
      text: "El recordatorio fue eliminado correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

  } catch (error) {
    console.error("Error al eliminar recordatorio:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al eliminar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

async function restoreReminder(reminderId) {
  const reminder = getReminderById(reminderId);

  if (!reminder) {
    Swal.fire({
      title: "Recordatorio no encontrado",
      text: "No se encontró el recordatorio para restaurar.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const updatedReminder = {
    title: reminder.title,
    original_text: reminder.original_text,
    reminder_date: getReminderDateValue(reminder.reminder_date),
    reminder_time: reminder.reminder_time || null,
    category: reminder.category || "Personal",
    repeat_type: reminder.repeat_type || "una_vez",
    status: "activo"
  };

  try {
    const response = await fetch(`${REMINDERS_API_URL}/${reminderId}`, {
      method: "PUT",
      headers: getReminderAuthHeaders(true),
      body: JSON.stringify(updatedReminder)
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }
    

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo restaurar",
        text: data.mensaje || "No se pudo restaurar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await loadReminders();

    Swal.fire({
      title: "Recordatorio restaurado",
      text: "El recordatorio volvió a quedar activo.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

  } catch (error) {
    console.error("Error al restaurar recordatorio:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al restaurar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

async function deleteReminderPermanently(reminderId) {
  const result = await Swal.fire({
    title: "¿Eliminar definitivamente?",
    text: "Esta acción borrará el recordatorio de forma permanente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar definitivo",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#960018",
    cancelButtonColor: "#6b7280"
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(`${REMINDERS_API_URL}/${reminderId}/permanent`, {
      method: "DELETE",
      headers: getReminderAuthHeaders()
    });
    const data = await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo eliminar",
        text: data.mensaje || "No se pudo eliminar definitivamente el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await loadReminders();

    Swal.fire({
      title: "Eliminado definitivamente",
      text: "El recordatorio fue eliminado de la base de datos.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

  } catch (error) {
    console.error("Error al eliminar definitivamente:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al eliminar definitivamente el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function isRecurringReminder(reminder) {
  return reminder.repeat_type === "diario" ||
    reminder.repeat_type === "semanal" ||
    reminder.repeat_type === "mensual" ||
    reminder.repeat_type === "anual";
}

function getNextReminderDate(reminderDate, repeatType) {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  let nextDate = new Date(`${getReminderDateValue(reminderDate)}T00:00:00`);

  if (repeatType === "diario") {
    do {
      nextDate.setDate(nextDate.getDate() + 1);
    } while (nextDate <= todayStart);
  }

  if (repeatType === "semanal") {
    do {
      nextDate.setDate(nextDate.getDate() + 7);
    } while (nextDate <= todayStart);
  }

  if (repeatType === "mensual") {
    do {
      nextDate = addOneMonthSafely(nextDate);
    } while (nextDate <= todayStart);
  }

  if (repeatType === "anual") {
    do {
      nextDate = addOneYearSafely(nextDate);
    } while (nextDate <= todayStart);
  }

  return formatDateForDatabase(nextDate);
}

function addOneMonthSafely(date) {
  const originalDay = date.getDate();

  const nextDate = new Date(date);
  nextDate.setDate(1);
  nextDate.setMonth(nextDate.getMonth() + 1);

  const lastDayOfMonth = new Date(
    nextDate.getFullYear(),
    nextDate.getMonth() + 1,
    0
  ).getDate();

  nextDate.setDate(Math.min(originalDay, lastDayOfMonth));

  return nextDate;
}

function addOneYearSafely(date) {
  const originalMonth = date.getMonth();
  const originalDay = date.getDate();

  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + 1);

  if (nextDate.getMonth() !== originalMonth) {
    nextDate.setMonth(originalMonth + 1, 0);
  }

  const lastDayOfMonth = new Date(
    nextDate.getFullYear(),
    originalMonth + 1,
    0
  ).getDate();

  nextDate.setMonth(originalMonth);
  nextDate.setDate(Math.min(originalDay, lastDayOfMonth));

  return nextDate;
}

async function toggleReminderStatus(reminderId) {
  const reminder = getReminderById(reminderId);

  if (!reminder) {
    Swal.fire({
      title: "Recordatorio no encontrado",
      text: "No se encontró el recordatorio para completar.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  await completeReminder(reminder, true);
}

async function completeReminder(reminder, showSuccessMessage = true) {
  const isRecurring = isRecurringReminder(reminder);

  const updatedReminder = {
    title: reminder.title,
    original_text: reminder.original_text,
    reminder_date: isRecurring
      ? getNextReminderDate(reminder.reminder_date, reminder.repeat_type)
      : getReminderDateValue(reminder.reminder_date),
    reminder_time: reminder.reminder_time || null,
    category: reminder.category || "Personal",
    repeat_type: reminder.repeat_type || "una_vez",
    status: isRecurring ? "activo" : "papelera"
  };

  try {
    const response = await fetch(`${REMINDERS_API_URL}/${reminder.id}`, {
      method: "PUT",
      headers: getReminderAuthHeaders(true),
      body: JSON.stringify(updatedReminder)
    });

    const data = await response.json();
    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo completar",
        text: data.mensaje || "No se pudo completar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await loadReminders();

    if (!showSuccessMessage) {
      return;
    }

    Swal.fire({
      title: isRecurring ? "Recordatorio reprogramado" : "Recordatorio completado",
      text: isRecurring
        ? `Se movió a la próxima fecha: ${formatReminderDateLabel(updatedReminder.reminder_date)}.`
        : "El recordatorio fue enviado a la papelera. Podrás recuperarlo durante 30 días.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

  } catch (error) {
    console.error("Error al completar recordatorio:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al completar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}



function renderRemindersSection() {
  const contentEl = document.getElementById("section-content");

  contentEl.innerHTML = `
    <div class="voice-reminders-section">

      <div class="voice-reminders-header">
        <div>
          <span class="welcome-badge">Recordatorios</span>
          <h2>Crea tus recordatorios</h2>
          <p>
            Puedes crear un recordatorio manualmente con fecha, hora y repetición.
          </p>
        </div>

        <button type="button" id="enableReminderAlertsButton" class="enable-alerts-button">
          <i class="fa-solid fa-volume-high"></i>
          Activar alertas
        </button>
      </div>

      <div class="manual-reminder-panel">
        <div class="manual-reminder-header">
          <span class="welcome-badge">Nuevo recordatorio</span>
          <h3>Agregar recordatorio manual</h3>
        </div>

        <form id="manualReminderForm" class="manual-reminder-form">
          <div class="manual-reminder-grid">
            <div class="manual-reminder-field">
              <label for="manualReminderTitle">Título</label>
              <input 
                type="text" 
                id="manualReminderTitle" 
                placeholder="Ej: Pagar internet"
                required
              >
            </div>

            <div class="manual-reminder-field">
              <label for="manualReminderCategory">Categoría</label>
              <select id="manualReminderCategory" required>
                <option value="personal">Personal</option>
                <option value="salud">Salud</option>
                <option value="trabajo">Trabajo</option>
                <option value="pagos">Pagos</option>
                <option value="estudio">Estudio</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div class="manual-reminder-field">
              <label for="manualReminderDate">Fecha</label>
              <input 
                type="date" 
                id="manualReminderDate" 
                required
              >
            </div>

            <div class="manual-reminder-field">
              <label for="manualReminderTime">Hora</label>
              <input 
                type="time" 
                id="manualReminderTime" 
                required
              >
            </div>

            <div class="manual-reminder-field">
              <label for="manualReminderRepeat">Repetición</label>
              <select id="manualReminderRepeat" required>
                <option value="una_vez">Una vez</option>
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <button type="submit" class="manual-reminder-submit">
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar recordatorio
          </button>
        </form>
      </div>

      <div class="voice-reminder-panel">
        <button type="button" id="voiceReminderButton" class="voice-reminder-button">
          <i class="fa-solid fa-microphone"></i>
        </button>

        <div class="voice-reminder-info">
          <h3>¿Qué quieres que te recuerde?</h3>
          <p id="voiceReminderStatus">
            Toca el micrófono para empezar a hablar.
          </p>
        </div>
      </div>

      <div id="detectedReminderBox" class="detected-reminder-box" style="display: none;"></div>

      <div class="reminders-list-panel">
        <div class="reminders-list-header">
          <h3>Agenda de avisos</h3>
        </div>

        <div class="reminder-filters">
          <button type="button" class="reminder-filter-button active" data-filter="activos">
            Activos
          </button>

          <button type="button" class="reminder-filter-button" data-filter="hoy">
            Hoy
          </button>

          <button type="button" class="reminder-filter-button" data-filter="papelera">
            Papelera
          </button>

          <button type="button" class="reminder-filter-button" data-filter="todos">
            Todos
          </button>
        </div>

        <div id="remindersList" class="reminders-list">
          <p class="empty-reminders">Aún no tienes recordatorios registrados.</p>
        </div>
      </div>
    </div>
  `;

  const voiceButton = document.getElementById("voiceReminderButton");
  const enableAlertsButton = document.getElementById("enableReminderAlertsButton");
  const manualReminderForm = document.getElementById("manualReminderForm");

  if (voiceButton) {
    voiceButton.addEventListener("click", startVoiceReminder);
  }

  if (enableAlertsButton) {
    enableAlertsButton.addEventListener("click", enableReminderAlerts);
  }

  if (manualReminderForm) {
    manualReminderForm.addEventListener("submit", handleManualReminderSubmit);
  }

  const reminderSearchTarget = getReminderSearchTarget();

  if (reminderSearchTarget.type === "reminder") {
    if (
      reminderSearchTarget.status === "papelera" ||
      reminderSearchTarget.status === "completado"
    ) {
      currentReminderFilter = "papelera";
    } else {
      currentReminderFilter = "todos";
    }
  }

  setupReminderFilters();
  loadReminders();
}

async function handleManualReminderSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("manualReminderTitle").value.trim();
  const category = document.getElementById("manualReminderCategory").value;
  const reminderDate = document.getElementById("manualReminderDate").value;
  const reminderTime = document.getElementById("manualReminderTime").value;
  const repeatType = document.getElementById("manualReminderRepeat").value;

  if (!title || !category || !reminderDate || !reminderTime || !repeatType) {
    Swal.fire({
      title: "Datos incompletos",
      text: "Completa todos los campos del recordatorio.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const token = localStorage.getItem("authToken");

  if (!token) {
    Swal.fire({
      title: "Sesión no encontrada",
      text: "Inicia sesión nuevamente.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });

    window.location.href = "login_google.html";
    return;
  }

  const reminderData = {
    title,
    original_text: title,
    text_original: title,
    category,
    reminder_date: reminderDate,
    reminder_time: `${reminderTime}:00`,
    repeat_type: repeatType
  };

  try {
    const response = await fetch(REMINDERS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(reminderData)
    });

    const data = await response.json();

    if (response.status === 401) {
      Swal.fire({
        title: "Sesión vencida",
        text: data.mensaje || "Inicia sesión nuevamente.",
        icon: "warning",
        confirmButtonColor: "#960018"
      });

      localStorage.removeItem("userData");
      localStorage.removeItem("authToken");
      window.location.href = "login_google.html";
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo guardar",
        text: data.mensaje || data.error || "No se pudo guardar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await Swal.fire({
      title: "Recordatorio creado",
      text: data.mensaje || "Tu recordatorio fue guardado correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

    event.target.reset();

  if (typeof showSection === "function") {
    window.location.hash = "recordatorios";
    showSection("recordatorios");
  } else {
    await loadReminders();
  }

  setTimeout(() => {
    const remindersList = document.getElementById("remindersList");

    if (remindersList) {
      const y = remindersList.getBoundingClientRect().top + window.scrollY - 90;

      window.scrollTo({
        top: y,
        behavior: "smooth"
      });
    }
  }, 700);

  } catch (error) {
    console.error("Error al guardar recordatorio manual:", error);

    Swal.fire({
      title: "Error",
      text: "No fue posible guardar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function setupReminderFilters() {
  const filterButtons = document.querySelectorAll(".reminder-filter-button");

  filterButtons.forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.filter === currentReminderFilter) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      currentReminderFilter = button.dataset.filter;

      filterButtons.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      renderRemindersList();
    });
  });
}

function isReminderInTrash(reminder) {
  return reminder.status === "papelera" || reminder.status === "completado";
}

function isAnnualReminderDueToday(reminder, today) {
  const reminderDate = getReminderDateValue(reminder.reminder_date);

  if (!reminderDate) {
    return false;
  }

  // Si la fecha original todavía no ha llegado, no se muestra.
  if (reminderDate > today) {
    return false;
  }

  // Para anual, se compara día y mes. Ej: 2026-07-08 -> 07-08
  return reminderDate.slice(5) === today.slice(5);
}

function shouldShowReminderOnBoard(reminder, today) {
  if (reminder.repeat_type === "anual") {
    return isAnnualReminderDueToday(reminder, today);
  }

  return true;
}

function isReminderDueForTodayFilter(reminder, today) {
  if (reminder.repeat_type === "anual") {
    return isAnnualReminderDueToday(reminder, today);
  }

  return getReminderDateValue(reminder.reminder_date) === today;
}

function getFilteredReminders() {
  const today = getTodayDate();

  let filteredReminders = reminders;

  if (currentReminderFilter === "activos") {
    filteredReminders = reminders.filter((reminder) => {
      return reminder.status === "activo"
        && shouldShowReminderOnBoard(reminder, today);
    });
  }

  if (currentReminderFilter === "hoy") {
    filteredReminders = reminders.filter((reminder) => {
      return reminder.status === "activo"
        && isReminderDueForTodayFilter(reminder, today);
    });
  }

  if (currentReminderFilter === "papelera") {
    filteredReminders = reminders.filter((reminder) => {
      return isReminderInTrash(reminder);
    });
  }

  if (currentReminderFilter === "todos") {
    filteredReminders = reminders.filter((reminder) => {
      return !isReminderInTrash(reminder)
        && shouldShowReminderOnBoard(reminder, today);
    });
  }

  return sortReminders(filteredReminders);
}

function sortReminders(reminderList) {
  return [...reminderList].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "activo" ? -1 : 1;
    }

    const dateA = `${getReminderDateValue(a.reminder_date)} ${a.reminder_time || "00:00:00"}`;
    const dateB = `${getReminderDateValue(b.reminder_date)} ${b.reminder_time || "00:00:00"}`;

    return dateA.localeCompare(dateB);
  });
}

function getEmptyRemindersMessage() {
  if (currentReminderFilter === "activos") {
    return {
      icon: "fa-bell",
      title: "No tienes avisos activos",
      text: "Los recordatorios pendientes aparecerán aquí."
    };
  }

  if (currentReminderFilter === "hoy") {
    return {
      icon: "fa-calendar-day",
      title: "No tienes avisos para hoy",
      text: "Los recordatorios activos con fecha de hoy aparecerán aquí."
    };
  }

  if (currentReminderFilter === "papelera") {
    return {
      icon: "fa-trash-can",
      title: "La papelera está vacía",
      text: "Los recordatorios completados o eliminados aparecerán aquí durante 30 días."
    };
  }

  return {
    icon: "fa-bell-slash",
    title: "No tienes avisos registrados",
    text: "Cuando crees un recordatorio por voz, aparecerá en esta agenda."
  };
}
