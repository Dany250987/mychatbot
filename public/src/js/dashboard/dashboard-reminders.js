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
let pendingCreatedReminderId = null;

let activitySearchText = "";
let currentActivitiesPage = 1;

const ACTIVITIES_PAGE_SIZE_DESKTOP = 6;
const ACTIVITIES_PAGE_SIZE_MOBILE = 5;

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

function getActivityPriorityLabel(priority) {
  const labels = {
    alta: "Alta prioridad",
    media: "Prioridad media",
    baja: "Baja prioridad"
  };

  return labels[priority] || "Prioridad media";
}

function getActivityPriorityClass(priority) {
  const classes = {
    alta: "activity-priority-high",
    media: "activity-priority-medium",
    baja: "activity-priority-low"
  };

  return classes[priority] || "activity-priority-medium";
}

function getActivityDescription(reminder) {
  return reminder.description || reminder.original_text || "Sin descripción adicional.";
}

function getActivityDueDateLabel(reminder) {
  const dueDate = reminder.due_date || reminder.reminder_date;

  return formatReminderDateLabel(dueDate);
}

function getActivityReminderLabel(reminder) {
  const reminderDate = formatReminderDateLabel(reminder.reminder_date);
  const reminderTime = reminder.reminder_time
    ? formatReminderTime(reminder.reminder_time)
    : "Sin hora";

  return `${reminderDate} · ${reminderTime}`;
}

function getActivitiesPageSize() {
  const isNativeMobile =
    document.documentElement.classList.contains("danybot-mobile-app");

  if (isNativeMobile || window.innerWidth <= 768) {
    return ACTIVITIES_PAGE_SIZE_MOBILE;
  }

  return ACTIVITIES_PAGE_SIZE_DESKTOP;
}

function getActivitySearchValue(reminder) {
  return [
    reminder.title,
    reminder.original_text,
    reminder.description,
    reminder.category,
    reminder.priority,
    reminder.repeat_type,
    reminder.status
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesActivitySearch(reminder) {
  const search = activitySearchText.trim().toLowerCase();

  if (!search) {
    return true;
  }

  return getActivitySearchValue(reminder).includes(search);
}

function isActivityOverdue(reminder) {
  const today = getTodayDate();
  const dueDate = getReminderDateValue(reminder.due_date || reminder.reminder_date);

  return reminder.status === "activo"
    && dueDate
    && dueDate < today;
}

function getPaginatedActivities(activityList) {
  const pageSize = getActivitiesPageSize();
  const totalPages = Math.max(1, Math.ceil(activityList.length / pageSize));

  if (currentActivitiesPage > totalPages) {
    currentActivitiesPage = totalPages;
  }

  if (currentActivitiesPage < 1) {
    currentActivitiesPage = 1;
  }

  const start = (currentActivitiesPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: activityList.slice(start, end),
    totalPages,
    pageSize,
    totalItems: activityList.length
  };
}

function renderActivitiesPagination(totalPages, totalItems) {
  const pagination = document.getElementById("activitiesPagination");

  if (!pagination) {
    return;
  }

  if (totalItems === 0 || totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
    <button 
      type="button" 
      class="activities-page-button"
      ${currentActivitiesPage === 1 ? "disabled" : ""}
      onclick="changeActivitiesPage(${currentActivitiesPage - 1})"
    >
      <i class="fa-solid fa-chevron-left"></i>
      Anterior
    </button>

    <span class="activities-page-info">
      Página ${currentActivitiesPage} de ${totalPages}
    </span>

    <button 
      type="button" 
      class="activities-page-button"
      ${currentActivitiesPage === totalPages ? "disabled" : ""}
      onclick="changeActivitiesPage(${currentActivitiesPage + 1})"
    >
      Siguiente
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
}

function changeActivitiesPage(page) {
  currentActivitiesPage = page;
  renderRemindersList();

  const listPanel = document.querySelector(".reminders-list-panel");

  if (listPanel) {
    listPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function setupActivitySearch() {
  const searchInput = document.getElementById("activitySearchInput");

  if (!searchInput) {
    return;
  }

  searchInput.value = activitySearchText;

  searchInput.addEventListener("input", () => {
    activitySearchText = searchInput.value;
    currentActivitiesPage = 1;
    renderRemindersList();
  });
}

function renderRemindersList() {
  const list = document.getElementById("remindersList");

  if (!list) {
    return;
  }

  const sortedReminders = getFilteredReminders();
  const paginatedActivities = getPaginatedActivities(sortedReminders);

  if (sortedReminders.length === 0) {
    renderActivitiesPagination(1, 0);
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

  paginatedActivities.items.forEach((reminder) => {
    const card = document.createElement("div");

    const categoryClass = getReminderCategoryClass(reminder.category);

    card.classList.add("reminder-timeline-card", categoryClass);
    card.classList.add(`reminder-status-${getReminderStatusClass(reminder)}`);
    card.dataset.reminderId = reminder.id;

    if (isReminderSearchTarget(reminder.id)) {
      card.classList.add("dashboard-search-target-card");
    }

    card.innerHTML = `
      <div class="activity-card-header">
        <span class="activity-priority-pill ${getActivityPriorityClass(reminder.priority)}">
          <i class="fa-solid fa-flag"></i>
          ${getActivityPriorityLabel(reminder.priority)}
        </span>

        <span class="activity-status-pill ${getReminderStatusClass(reminder)}">
          ${getReminderStatusLabel(reminder)}
        </span>
      </div>

      <div class="activity-card-body">
        <div class="activity-title-row">
          <span class="activity-category-icon">
            <i class="fa-solid ${getReminderCategoryIcon(reminder.category)}"></i>
          </span>

          <div>
            <h3>${reminder.title}</h3>
            <span class="activity-category-label">
              ${reminder.category || "Personal"} · ${formatRepeatType(reminder.repeat_type)}
            </span>
          </div>
        </div>

        <p class="activity-description">
          ${getActivityDescription(reminder)}
        </p>

        <div class="activity-info-grid">
          <div class="activity-info-item">
            <span>Fecha límite</span>
            <strong>
              <i class="fa-solid fa-calendar-check"></i>
              ${getActivityDueDateLabel(reminder)}
            </strong>
          </div>

          <div class="activity-info-item">
            <span>Aviso</span>
            <strong>
              <i class="fa-solid fa-bell"></i>
              ${getActivityReminderLabel(reminder)}
            </strong>
          </div>

          <div class="activity-info-item">
            <span>Repetición</span>
            <strong>
              <i class="fa-solid ${getRepeatTypeIcon(reminder.repeat_type)}"></i>
              ${formatRepeatType(reminder.repeat_type)}
            </strong>
          </div>
        </div>
      </div>

      ${renderReminderActions(reminder)}
    `;

    list.appendChild(card);

    if (isReminderSearchTarget(reminder.id)) {
      highlightReminderSearchTargetElement(card);
    }
  });

  renderActivitiesPagination(
    paginatedActivities.totalPages,
    paginatedActivities.totalItems
  );
}


function scrollToCreatedReminderCard(reminderId) {
  if (!reminderId) return;

  let attempts = 0;
  const maxAttempts = 60;

  function tryScroll() {
    const card = document.querySelector(
      `.reminder-timeline-card[data-reminder-id="${reminderId}"]`
    );

    if (card) {
      setTimeout(() => {
        card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        card.classList.add("dashboard-search-highlight");

        setTimeout(() => {
          card.classList.remove("dashboard-search-highlight");
          pendingCreatedReminderId = null;
        }, 4000);
      }, 300);

      return;
    }

    attempts++;

    if (attempts < maxAttempts) {
      setTimeout(tryScroll, 150);
    } else {
      pendingCreatedReminderId = null;
    }
  }

  setTimeout(tryScroll, 250);
}

function isPendingCreatedReminder(reminder) {
  return pendingCreatedReminderId !== null
    && Number(reminder.id) === Number(pendingCreatedReminderId);
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
      title: "Editar actividad",
      html: `
        <div class="reminder-edit-modal">
          <label for="editReminderTitle">Título</label>
          <input 
            id="editReminderTitle" 
            class="swal2-input" 
            value="${reminder.title || ""}"
          >

          <label for="editReminderDescription">Descripción</label>
          <textarea
            id="editReminderDescription"
            class="swal2-textarea"
            placeholder="Agrega una descripción opcional"
          >${reminder.description || ""}</textarea>

          <label for="editReminderPriority">Prioridad</label>
          <select id="editReminderPriority" class="swal2-input">
            <option value="baja" ${reminder.priority === "baja" ? "selected" : ""}>Baja</option>
            <option value="media" ${!reminder.priority || reminder.priority === "media" ? "selected" : ""}>Media</option>
            <option value="alta" ${reminder.priority === "alta" ? "selected" : ""}>Alta</option>
          </select>

          <label for="editReminderDueDate">Fecha límite</label>
          <input 
            id="editReminderDueDate" 
            type="date" 
            class="swal2-input" 
            value="${getReminderDateValue(reminder.due_date || reminder.reminder_date)}"
          >

          <label for="editReminderDate">Fecha de aviso</label>
          <input 
            id="editReminderDate" 
            type="date" 
            class="swal2-input" 
            value="${getReminderDateValue(reminder.reminder_date)}"
          >

          <label for="editReminderTime">Hora de aviso</label>
          <input 
            id="editReminderTime" 
            type="time" 
            class="swal2-input" 
            value="${reminder.reminder_time ? reminder.reminder_time.substring(0, 5) : ""}"
          >

          <label for="editReminderCategory">Categoría</label>
          <select id="editReminderCategory" class="swal2-input">
            <option value="personal" ${reminder.category === "personal" || reminder.category === "Personal" ? "selected" : ""}>Personal</option>
            <option value="finanzas" ${reminder.category === "finanzas" || reminder.category === "Finanzas" ? "selected" : ""}>Finanzas</option>
            <option value="estudio" ${reminder.category === "estudio" || reminder.category === "Estudio" ? "selected" : ""}>Estudio</option>
            <option value="trabajo" ${reminder.category === "trabajo" || reminder.category === "Trabajo" ? "selected" : ""}>Trabajo</option>
            <option value="salud" ${reminder.category === "salud" || reminder.category === "Salud" ? "selected" : ""}>Salud</option>
            <option value="pagos" ${reminder.category === "pagos" ? "selected" : ""}>Pagos</option>
            <option value="otro" ${reminder.category === "otro" ? "selected" : ""}>Otro</option>
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
            <option value="papelera" ${reminder.status === "papelera" ? "selected" : ""}>Papelera</option>
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
        const description = document.getElementById("editReminderDescription").value.trim();
        const priority = document.getElementById("editReminderPriority").value;
        const dueDate = document.getElementById("editReminderDueDate").value;
        const reminderDate = document.getElementById("editReminderDate").value;
        const reminderTime = document.getElementById("editReminderTime").value;
        const category = document.getElementById("editReminderCategory").value;
        const repeatType = document.getElementById("editReminderRepeat").value;
        const status = document.getElementById("editReminderStatus").value;

        if (!title || !reminderDate) {
          Swal.showValidationMessage("El título y la fecha de aviso son obligatorios.");
          return false;
        }

        return {
          title,
          original_text: reminder.original_text || title,
          description: description || null,
          reminder_date: reminderDate,
          due_date: dueDate || reminderDate,
          reminder_time: reminderTime ? `${reminderTime}:00` : null,
          category,
          priority,
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

    const nextReminderDate = isRecurring
    ? getNextReminderDate(reminder.reminder_date, reminder.repeat_type)
    : getReminderDateValue(reminder.reminder_date);

    const updatedReminder = {
      title: reminder.title,
      original_text: reminder.original_text || reminder.title,
      description: reminder.description || null,
      reminder_date: nextReminderDate,
      due_date: reminder.due_date
        ? getReminderDateValue(reminder.due_date)
        : nextReminderDate,
      reminder_time: reminder.reminder_time || null,
      category: reminder.category || "personal",
      priority: reminder.priority || "media",
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
          <span class="welcome-badge">Actividades</span>
          <h2>Organiza tus actividades</h2>
          <p>
            Crea pendientes, avisos y recordatorios con prioridad, fecha límite y alertas opcionales.
          </p>
        </div>

        <button type="button" id="enableReminderAlertsButton" class="enable-alerts-button">
          <i class="fa-solid fa-volume-high"></i>
          Activar alertas
        </button>
      </div>

      <div class="manual-reminder-panel">
        <div class="manual-reminder-header">
          <span class="welcome-badge">Nueva actividad</span>
          <h3>Agregar actividad manual</h3>
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
            <div class="manual-reminder-field manual-reminder-field-full">
              <label for="manualReminderDescription">Descripción</label>
              <textarea
                id="manualReminderDescription"
                placeholder="Ej: Pago mensual del servicio de internet"
                rows="3"
              ></textarea>
            </div>

            <div class="manual-reminder-field">
              <label for="manualReminderPriority">Prioridad</label>
              <select id="manualReminderPriority" required>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="baja">Baja</option>
              </select>
            </div>

            <div class="manual-reminder-field">
              <label for="manualReminderDueDate">Fecha límite</label>
              <input 
                type="date" 
                id="manualReminderDueDate"
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
              <label for="manualReminderTime">Hora de aviso</label>
              <input 
                type="time" 
                id="manualReminderTime" 
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
            Guardar actividad
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
          <h3>Mis actividades</h3>
        </div>

        <div class="activities-toolbar">
  <div class="activity-search-box">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input 
      type="search"
      id="activitySearchInput"
      placeholder="Buscar por título, descripción, categoría o prioridad..."
      autocomplete="off"
    >
  </div>

  <div class="reminder-filters">
        <button type="button" class="reminder-filter-button active" data-filter="activos">
          Activos
        </button>

        <button type="button" class="reminder-filter-button" data-filter="hoy">
          Hoy
        </button>

        <button type="button" class="reminder-filter-button" data-filter="vencidos">
          Vencidos
        </button>

        <button type="button" class="reminder-filter-button" data-filter="alta">
          Alta
        </button>

        <button type="button" class="reminder-filter-button" data-filter="media">
          Media
        </button>

        <button type="button" class="reminder-filter-button" data-filter="baja">
          Baja
        </button>

        <button type="button" class="reminder-filter-button" data-filter="papelera">
          Papelera
        </button>

        <button type="button" class="reminder-filter-button" data-filter="todos">
          Todos
        </button>
      </div>
    </div>

        <div id="remindersList" class="reminders-list">
          <p class="empty-reminders">Aún no tienes recordatorios registrados.</p>
        </div>
        <div id="activitiesPagination" class="activities-pagination"></div>
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
  setupActivitySearch();
  loadReminders();
}

async function handleManualReminderSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("manualReminderTitle").value.trim();
  const description = document.getElementById("manualReminderDescription").value.trim();
  const category = document.getElementById("manualReminderCategory").value;
  const priority = document.getElementById("manualReminderPriority").value;
  const dueDate = document.getElementById("manualReminderDueDate").value;
  const reminderDate = document.getElementById("manualReminderDate").value;
  const reminderTime = document.getElementById("manualReminderTime").value;
  const repeatType = document.getElementById("manualReminderRepeat").value;

  if (!title || !category || !priority || !reminderDate || !repeatType) {
    Swal.fire({
      title: "Datos incompletos",
      text: "Completa los campos obligatorios de la actividad.",
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
    description: description || null,
    category,
    priority,
    due_date: dueDate || reminderDate,
    reminder_date: reminderDate,
    reminder_time: reminderTime ? `${reminderTime}:00` : null,
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

    const createdReminderId = data.reminder_id;

    pendingCreatedReminderId = createdReminderId;

    event.target.reset();

    if (typeof currentReminderFilter !== "undefined") {
      currentReminderFilter = "activos";
    }

    if (typeof showSection === "function") {
      window.location.hash = "recordatorios";
      showSection("recordatorios");
    } else {
      await loadReminders();
    }

    scrollToCreatedReminderCard(createdReminderId);


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
      currentActivitiesPage = 1;

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
        && (
          shouldShowReminderOnBoard(reminder, today) ||
          isPendingCreatedReminder(reminder)
        );
    });
  }

  if (currentReminderFilter === "hoy") {
    filteredReminders = reminders.filter((reminder) => {
      return reminder.status === "activo"
        && isReminderDueForTodayFilter(reminder, today);
    });
  }

  if (currentReminderFilter === "vencidos") {
    filteredReminders = reminders.filter((reminder) => {
      return isActivityOverdue(reminder);
    });
  }

  if (currentReminderFilter === "alta") {
    filteredReminders = reminders.filter((reminder) => {
      return reminder.status === "activo"
        && (reminder.priority || "media") === "alta";
    });
  }

  if (currentReminderFilter === "media") {
    filteredReminders = reminders.filter((reminder) => {
      return reminder.status === "activo"
        && (!reminder.priority || reminder.priority === "media");
    });
  }

  if (currentReminderFilter === "baja") {
    filteredReminders = reminders.filter((reminder) => {
      return reminder.status === "activo"
        && reminder.priority === "baja";
    });
  }

  if (currentReminderFilter === "papelera") {
    filteredReminders = reminders.filter((reminder) => {
      return isReminderInTrash(reminder);
    });
  }

  if (currentReminderFilter === "todos") {
    filteredReminders = reminders.filter((reminder) => {
      return !isReminderInTrash(reminder);
    });
  }

  filteredReminders = filteredReminders.filter(matchesActivitySearch);

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

    if (currentReminderFilter === "vencidos") {
    return {
      icon: "fa-triangle-exclamation",
      title: "No tienes actividades vencidas",
      text: "Las actividades activas con fecha límite vencida aparecerán aquí."
    };
  }

  if (currentReminderFilter === "alta") {
    return {
      icon: "fa-flag",
      title: "No tienes actividades de alta prioridad",
      text: "Las actividades marcadas como alta prioridad aparecerán aquí."
    };
  }

  if (currentReminderFilter === "media") {
    return {
      icon: "fa-flag",
      title: "No tienes actividades de prioridad media",
      text: "Las actividades marcadas como prioridad media aparecerán aquí."
    };
  }

  if (currentReminderFilter === "baja") {
    return {
      icon: "fa-flag",
      title: "No tienes actividades de baja prioridad",
      text: "Las actividades marcadas como baja prioridad aparecerán aquí."
    };
  }

  return {
    icon: "fa-bell-slash",
    title: "No tienes avisos registrados",
    text: "Cuando crees un recordatorio por voz, aparecerá en esta agenda."
  };
}
