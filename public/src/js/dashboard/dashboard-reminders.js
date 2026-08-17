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
      hasHighlightedReminderSearchResult = false;

      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    }, 4000);
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

// =====================================================
// CARGADOR INTERNO DE ACTIVIDADES MÓVIL
// =====================================================

function showMobileActivitiesLoader() {
  const isMobileActivitiesView =
    document.documentElement.classList.contains(
      "danybot-mobile-app"
    ) &&
    document.documentElement.classList.contains(
      "danybot-activities-view"
    );

  if (!isMobileActivitiesView) {
    return;
  }

  const remindersList =
    document.getElementById("remindersList");

  if (!remindersList) {
    return;
  }

  remindersList.innerHTML = `
    <div
      id="mobileActivitiesLoader"
      class="mobile-activities-loader"
      role="status"
      aria-live="polite"
    >
      <img
        src="./src/img/danybot.png"
        alt=""
        aria-hidden="true"
      >

      <p>Cargando actividades</p>

      <div
        class="mobile-activities-loader-dots"
        aria-hidden="true"
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

function hideMobileActivitiesLoader() {
  const loader =
    document.getElementById(
      "mobileActivitiesLoader"
    );

  if (!loader) {
    return;
  }

  loader.classList.add("is-leaving");

  window.setTimeout(() => {
    loader.remove();
  }, 180);
}

async function loadReminders() {
  const token = getReminderAuthToken();

  if (!token) {
    await handleReminderUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  showMobileActivitiesLoader();

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

    /*
    * Si Android abrió la aplicación porque
    * el usuario pulsó "Completar" en una
    * notificación, procesamos la acción
    * después de tener los recordatorios cargados.
    */
    await processDanyBotPendingNotificationAction();

    } catch (error) {
    console.error(
      "Error al consultar recordatorios:",
      error
    );

  } finally {
    hideMobileActivitiesLoader();
  }
}

async function processDanyBotPendingNotificationAction() {
  if (
    typeof window.consumeDanyBotPendingNotificationAction !==
    "function"
  ) {
    return;
  }

  const action =
    window.consumeDanyBotPendingNotificationAction();

  if (
    !action ||
    action.type !== "complete-reminder"
  ) {
    return;
  }

  const reminderId = Number(action.reminderId);

  if (
    !Number.isInteger(reminderId) ||
    reminderId <= 0
  ) {
    return;
  }

  const reminder = reminders.find(
    (item) =>
      Number(item.id) === reminderId
  );

  if (!reminder) {
    console.warn(
      "No se encontró la actividad asociada a la notificación:",
      reminderId
    );
    return;
  }

  /*
   * Si ya no está activa, no intentamos
   * completarla otra vez.
   */
  if (reminder.status !== "activo") {
    return;
  }

  await completeReminder(
    reminder,
    false
  );
}

window.addEventListener(
  "danybot:notification-action",
  async () => {
    /*
     * Si Actividades ya está renderizada,
     * refrescamos para procesar inmediatamente
     * la acción que acaba de llegar.
     *
     * Si todavía no está renderizada,
     * el cambio de hash abrirá la sección
     * y loadReminders() la procesará después.
     */
    if (
      document.getElementById(
        "remindersList"
      )
    ) {
      await loadReminders();
    }
  }
);

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
          Eliminar
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

  if (isNativeMobile) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (window.innerWidth <= 768) {
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

  const isNativeMobile =
    document.documentElement.classList.contains("danybot-mobile-app");

  if (isNativeMobile) {
    pagination.innerHTML = "";
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

  const trashBulkActions =
    document.getElementById("trashBulkActions");

  if (trashBulkActions) {
    const hasTrashItems = reminders.some(
      (reminder) => isReminderInTrash(reminder)
    );

    trashBulkActions.hidden =
      activityStatusFilter !== "eliminados" ||
      !hasTrashItems;
  }

  const searchTarget = getReminderSearchTarget();

  const targetReminderId =
    searchTarget.type === "reminder" && searchTarget.id
      ? searchTarget.id
      : pendingCreatedReminderId;

  if (targetReminderId) {
    const targetIndex = sortedReminders.findIndex((reminder) => {
      return Number(reminder.id) === Number(targetReminderId);
    });

    if (targetIndex >= 0) {
      const pageSize = getActivitiesPageSize();
      const targetPage = Math.floor(targetIndex / pageSize) + 1;

      if (currentActivitiesPage !== targetPage) {
        currentActivitiesPage = targetPage;
      }
    }
  }

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
        if (
      typeof isDanyBotActivitiesMobileApp ===
        "function" &&
      isDanyBotActivitiesMobileApp()
    ) {
      const mobileCard =
        createMobileActivityCard(reminder);

      list.appendChild(mobileCard);

      if (isReminderSearchTarget(reminder.id)) {
        const summaryButton =
          mobileCard.querySelector(
            '.mobile-activity-summary'
          );

        const details =
          mobileCard.querySelector(
            '.mobile-activity-details'
          );

        const chevron =
          mobileCard.querySelector(
            '.mobile-activity-chevron'
          );

        if (summaryButton && details) {
          summaryButton.setAttribute(
            'aria-expanded',
            'true'
          );

          details.hidden = false;

          mobileCard.classList.add(
            'is-expanded'
          );

          if (chevron) {
            chevron.classList.remove(
              'fa-chevron-down'
            );

            chevron.classList.add(
              'fa-chevron-up'
            );
          }
        }

        highlightReminderSearchTargetElement(
          mobileCard
        );
      }

      return;
      
    }
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
      `.reminder-timeline-card[data-reminder-id="${reminderId}"],
       .mobile-activity-card[data-reminder-id="${reminderId}"]`
    );

    if (card) {
      /*
       * En móvil dejamos abierta automáticamente
       * la actividad que acaba de ser creada.
       */
      if (card.classList.contains("mobile-activity-card")) {
        const summaryButton =
          card.querySelector(".mobile-activity-summary");

        const details =
          card.querySelector(".mobile-activity-details");

        const chevron =
          card.querySelector(".mobile-activity-chevron");

        if (summaryButton && details) {
          summaryButton.setAttribute(
            "aria-expanded",
            "true"
          );

          details.hidden = false;

          card.classList.add("is-expanded");

          if (chevron) {
            chevron.classList.remove(
              "fa-chevron-down"
            );

            chevron.classList.add(
              "fa-chevron-up"
            );
          }
        }
      }

      /*
       * Centramos la card recién creada
       * y la resaltamos temporalmente.
       */
      setTimeout(() => {
        card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        card.classList.add(
          "dashboard-search-highlight"
        );

        setTimeout(() => {
          card.classList.remove(
            "dashboard-search-highlight"
          );

          pendingCreatedReminderId = null;
        }, 4000);
      }, 300);

      return;
    }

    /*
     * Si la lista todavía se está renderizando,
     * esperamos un momento y volvemos a buscar.
     */
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

    /*
    * Después de actualizar, conservamos la actividad
    * como objetivo para que el render pueda localizarla.
    */
    if (
      typeof pendingCreatedReminderId !==
      "undefined"
    ) {
      pendingCreatedReminderId = reminderId;
    }

    /*
    * Nos aseguramos de usar un filtro donde la actividad
    * actualizada pueda verse.
    */
    activityDateFilter = "all";
    activityPriorityFilter = "all";

    activityStatusFilter =
      result.value.status === "papelera" ||
      result.value.status === "completado"
        ? "eliminados"
        : "todos";

    if (
      typeof currentActivitiesPage !==
      "undefined"
    ) {
      currentActivitiesPage = 1;
    }

    await loadReminders();

    await Swal.fire({
      title: "Recordatorio actualizado",
      text: "Los cambios fueron guardados correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

    /*
    * Al cerrar la confirmación, abrimos, centramos
    * y resaltamos la card que acabamos de modificar.
    */
    if (
      typeof scrollToCreatedReminderCard ===
      "function"
    ) {
      scrollToCreatedReminderCard(reminderId);
    }

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
  const reminder = getReminderById(reminderId);

  const result = await Swal.fire({
    title: "¿Eliminar actividad?",
    text:
      "La actividad se moverá a Eliminados y podrás restaurarla mientras permanezca allí.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    buttonsStyling: false,
    customClass: {
      popup: "reminder-swal-popup",
      actions: "reminder-swal-actions",
      confirmButton: "reminder-swal-confirm",
      cancelButton: "reminder-swal-cancel"
    }
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${REMINDERS_API_URL}/${reminderId}`,
      {
        method: "DELETE",
        headers: getReminderAuthHeaders()
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      await Swal.fire({
        title: "No se pudo eliminar",
        text:
          data.mensaje ||
          "No se pudo eliminar la actividad.",
        icon: "error",
        confirmButtonText: "Aceptar",
        buttonsStyling: false,
        customClass: {
          popup: "reminder-swal-popup",
          actions: "reminder-swal-actions",
          confirmButton: "reminder-swal-confirm"
        }
      });

      return;
    }

    /*
     * Una actividad eliminada ya no debe
     * conservar una alarma pendiente en Android.
     */
    if (
      typeof window.cancelDanyBotLocalNotification ===
      "function"
    ) {
      await window.cancelDanyBotLocalNotification(
        reminderId
      );
    }

    await loadReminders();

    /*
     * Confirmación breve y compacta,
     * usando los mismos estilos de Día en Orden.
     */
    await Swal.fire({
      title: "Actividad eliminada",
      text:
        reminder?.title
          ? `"${reminder.title}" se movió a Eliminados.`
          : "La actividad se movió a Eliminados.",
      icon: "success",
      confirmButtonText: "Aceptar",
      buttonsStyling: false,
      customClass: {
        popup: "reminder-swal-popup",
        actions: "reminder-swal-actions",
        confirmButton: "reminder-swal-confirm"
      }
    });

  } catch (error) {
    console.error(
      "Error al eliminar recordatorio:",
      error
    );

    await Swal.fire({
      title: "Error",
      text:
        "Ocurrió un error al eliminar la actividad.",
      icon: "error",
      confirmButtonText: "Aceptar",
      buttonsStyling: false,
      customClass: {
        popup: "reminder-swal-popup",
        actions: "reminder-swal-actions",
        confirmButton: "reminder-swal-confirm"
      }
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
  const reminder = getReminderById(reminderId);

  const result = await Swal.fire({
    title: "¿Eliminar definitivamente?",
    text:
      "Esta actividad se borrará de forma permanente y ya no podrá recuperarse.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    buttonsStyling: false,
    customClass: {
      popup: "reminder-swal-popup",
      actions: "reminder-swal-actions",
      confirmButton: "reminder-swal-confirm",
      cancelButton: "reminder-swal-cancel"
    }
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${REMINDERS_API_URL}/${reminderId}/permanent`,
      {
        method: "DELETE",
        headers: getReminderAuthHeaders()
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      await Swal.fire({
        title: "No se pudo eliminar",
        text:
          data.mensaje ||
          "No se pudo eliminar definitivamente la actividad.",
        icon: "error",
        confirmButtonText: "Aceptar",
        buttonsStyling: false,
        customClass: {
          popup: "reminder-swal-popup",
          actions: "reminder-swal-actions",
          confirmButton: "reminder-swal-confirm"
        }
      });

      return;
    }

    /*
     * Por seguridad, eliminamos cualquier
     * notificación local que pudiera seguir pendiente.
     */
    if (
      typeof window.cancelDanyBotLocalNotification ===
      "function"
    ) {
      await window.cancelDanyBotLocalNotification(
        reminderId
      );
    }

    await loadReminders();

    await Swal.fire({
      title: "Actividad eliminada",
      text:
        reminder?.title
          ? `"${reminder.title}" se eliminó definitivamente.`
          : "La actividad se eliminó definitivamente.",
      icon: "success",
      confirmButtonText: "Aceptar",
      buttonsStyling: false,
      customClass: {
        popup: "reminder-swal-popup",
        actions: "reminder-swal-actions",
        confirmButton: "reminder-swal-confirm"
      }
    });

  } catch (error) {
    console.error(
      "Error al eliminar definitivamente:",
      error
    );

    await Swal.fire({
      title: "Error",
      text:
        "Ocurrió un error al eliminar definitivamente la actividad.",
      icon: "error",
      confirmButtonText: "Aceptar",
      buttonsStyling: false,
      customClass: {
        popup: "reminder-swal-popup",
        actions: "reminder-swal-actions",
        confirmButton: "reminder-swal-confirm"
      }
    });
  }
}

async function emptyReminderTrash() {
  const trashReminders = reminders.filter(
    (reminder) => isReminderInTrash(reminder)
  );

  if (trashReminders.length === 0) {
    return;
  }

  const result = await Swal.fire({
    title: "¿Vaciar eliminados?",
    text:
      `Se eliminarán definitivamente ${trashReminders.length} ${
        trashReminders.length === 1
          ? "actividad"
          : "actividades"
      }.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Vaciar",
    cancelButtonText: "Cancelar",
    buttonsStyling: false,
    customClass: {
      popup: "reminder-swal-popup",
      actions: "reminder-swal-actions",
      confirmButton: "reminder-swal-confirm",
      cancelButton: "reminder-swal-cancel"
    }
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${REMINDERS_API_URL}/trash/permanent`,
      {
        method: "DELETE",
        headers: getReminderAuthHeaders()
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(
        data
      );
      return;
    }

    if (!response.ok) {
      await Swal.fire({
        title: "No se pudo vaciar",
        text:
          data.mensaje ||
          "No se pudieron eliminar las actividades.",
        icon: "error",
        confirmButtonText: "Aceptar",
        buttonsStyling: false,
        customClass: {
          popup: "reminder-swal-popup",
          actions: "reminder-swal-actions",
          confirmButton: "reminder-swal-confirm"
        }
      });

      return;
    }

    /*
     * Eliminamos también cualquier alarma local
     * que pudiera haber quedado asociada a
     * actividades antiguas de la papelera.
     */
    if (
      typeof window.cancelDanyBotLocalNotification ===
      "function"
    ) {
      for (const reminder of trashReminders) {
        await window.cancelDanyBotLocalNotification(
          reminder.id
        );
      }
    }

    currentActivitiesPage = 1;

    await loadReminders();

    await Swal.fire({
      title: "Eliminados vaciados",
      text:
        data.eliminados === 1
          ? "Se eliminó 1 actividad definitivamente."
          : `Se eliminaron ${data.eliminados} actividades definitivamente.`,
      icon: "success",
      confirmButtonText: "Aceptar",
      buttonsStyling: false,
      customClass: {
        popup: "reminder-swal-popup",
        actions: "reminder-swal-actions",
        confirmButton: "reminder-swal-confirm"
      }
    });

  } catch (error) {
    console.error(
      "Error al vaciar eliminados:",
      error
    );

    await Swal.fire({
      title: "Error",
      text:
        "Ocurrió un error al vaciar las actividades eliminadas.",
      icon: "error",
      confirmButtonText: "Aceptar",
      buttonsStyling: false,
      customClass: {
        popup: "reminder-swal-popup",
        actions: "reminder-swal-actions",
        confirmButton: "reminder-swal-confirm"
      }
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

async function completeReminder(
  reminder,
  showSuccessMessage = true
) {
  const isRecurring =
    isRecurringReminder(reminder);

  const nextReminderDate = isRecurring
    ? getNextReminderDate(
        reminder.reminder_date,
        reminder.repeat_type
      )
    : getReminderDateValue(
        reminder.reminder_date
      );

  /*
   * Calculamos cuál habría sido la fecha límite
   * automática de la ocurrencia actual.
   */
  const currentAutoDueDate =
    getLastDayOfReminderMonth(
      reminder.reminder_date
    );

  /*
   * Consideramos automática la fecha límite si:
   * - no existe una fecha límite guardada, o
   * - coincide con el último día del mes de
   *   la ocurrencia actual.
   *
   * Si el usuario eligió otra fecha manualmente,
   * la conservamos.
   */
  const dueDateWasAutomatic =
    !reminder.due_date ||
    getReminderDateValue(
      reminder.due_date
    ) === currentAutoDueDate;

  const updatedReminder = {
    title: reminder.title,

    original_text:
      reminder.original_text ||
      reminder.title,

    description:
      reminder.description || null,

    reminder_date:
      nextReminderDate,

    /*
     * Para actividades recurrentes:
     *
     * - Si la fecha límite era automática,
     *   se actualiza al último día del mes
     *   de la siguiente ocurrencia.
     *
     * - Si fue elegida manualmente,
     *   se conserva.
     *
     * Para actividades no recurrentes,
     * mantenemos su fecha límite actual.
     */
    due_date: isRecurring
      ? (
          dueDateWasAutomatic
            ? getLastDayOfReminderMonth(
                nextReminderDate
              )
            : getReminderDateValue(
                reminder.due_date
              )
        )
      : (
          reminder.due_date
            ? getReminderDateValue(
                reminder.due_date
              )
            : getLastDayOfReminderMonth(
                nextReminderDate
              )
        ),

    reminder_time:
      reminder.reminder_time || null,

    category:
      reminder.category || "personal",

    priority:
      reminder.priority || "media",

    repeat_type:
      reminder.repeat_type || "una_vez",

    status:
      isRecurring
        ? "activo"
        : "papelera"
  };

  try {
    const response = await fetch(
      `${REMINDERS_API_URL}/${reminder.id}`,
      {
        method: "PUT",
        headers:
          getReminderAuthHeaders(true),
        body:
          JSON.stringify(updatedReminder)
      }
    );

    const data =
      await response.json();

    if (response.status === 401) {
      await handleReminderUnauthorizedSession(
        data
      );

      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo completar",
        text:
          data.mensaje ||
          "No se pudo completar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });

      return;
    }

    /*
     * La alarma correspondiente a la
     * ocurrencia que acabamos de completar
     * ya no debe permanecer pendiente.
     */
    if (
      typeof window
        .cancelDanyBotLocalNotification ===
      "function"
    ) {
      await window
        .cancelDanyBotLocalNotification(
          reminder.id
        );
    }

    /*
     * Si es recurrente, programamos
     * inmediatamente su siguiente aviso.
     */
    if (
      isRecurring &&
      updatedReminder.reminder_time &&
      typeof window
        .scheduleDanyBotReminderNotification ===
        "function"
    ) {
      await window
        .scheduleDanyBotReminderNotification({
          ...updatedReminder,
          id: reminder.id
        });
    }

    /*
     * Mostramos la actividad en el lugar
     * donde quedó después de completarla.
     */
    activityDateFilter = "all";
    activityPriorityFilter = "all";

    activityStatusFilter =
      isRecurring
        ? "todos"
        : "eliminados";

    currentActivitiesPage = 1;

    await loadReminders();

    /*
     * Esperamos el render y llevamos
     * al usuario directamente a la
     * card actualizada.
     */
    window.setTimeout(() => {
      scrollToCreatedReminderCard(
        reminder.id
      );
    }, 250);

    /*
     * Si la función fue llamada desde
     * la notificación, no mostramos
     * un segundo modal.
     */
    if (!showSuccessMessage) {
      return;
    }

  } catch (error) {
    console.error(
      "Error al completar recordatorio:",
      error
    );

    Swal.fire({
      title: "Error",
      text:
        "Ocurrió un error al completar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function getLastDayOfReminderMonth(dateValue) {
  if (!dateValue) {
    return "";
  }

  const [year, month] = String(dateValue)
    .substring(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month) {
    return "";
  }

  const lastDay = new Date(year, month, 0);

  const lastDayNumber =
    String(lastDay.getDate()).padStart(2, "0");

  return `${year}-${String(month).padStart(2, "0")}-${lastDayNumber}`;
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
              <label for="manualReminderDueDate">Fecha límite</label>
              <input 
                type="date" 
                id="manualReminderDueDate"
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


        <div class="reminder-filters activity-filter-bar">

          <!-- =========================
              FECHA
              ========================= -->
          <div
            class="activity-filter-dropdown"
            data-filter-group="date"
          >
            <button
              type="button"
              class="activity-filter-trigger"
              data-filter-trigger="date"
            >
              <span data-filter-label="date">
                Fecha
              </span>

              <i class="fa-solid fa-chevron-down"></i>
            </button>


            <div
              class="activity-filter-menu"
              data-filter-menu="date"
              hidden
            >
              <button
                type="button"
                data-filter-value="all"
              >
                Todas las fechas
              </button>

              <button
                type="button"
                data-filter-value="today"
              >
                Hoy
              </button>

              <button
                type="button"
                data-filter-value="week"
              >
                Esta semana
              </button>

              <button
                type="button"
                data-filter-value="month"
              >
                Este mes
              </button>
            </div>
          </div>


          <!-- =========================
              PRIORIDAD
              ========================= -->
          <div
            class="activity-filter-dropdown"
            data-filter-group="priority"
          >
            <button
              type="button"
              class="activity-filter-trigger"
              data-filter-trigger="priority"
            >
              <span data-filter-label="priority">
                Prioridad
              </span>

              <i class="fa-solid fa-chevron-down"></i>
            </button>


            <div
              class="activity-filter-menu"
              data-filter-menu="priority"
              hidden
            >
              <button
                type="button"
                data-filter-value="all"
              >
                Todas
              </button>

              <button
                type="button"
                data-filter-value="alta"
              >
                Alta
              </button>

              <button
                type="button"
                data-filter-value="media"
              >
                Media
              </button>

              <button
                type="button"
                data-filter-value="baja"
              >
                Baja
              </button>
            </div>
          </div>


          <!-- =========================
              ESTADO
              ========================= -->
          <div
            class="activity-filter-dropdown"
            data-filter-group="status"
          >
            <button
              type="button"
              class="activity-filter-trigger"
              data-filter-trigger="status"
            >
              <span data-filter-label="status">
                Estado
              </span>

              <i class="fa-solid fa-chevron-down"></i>
            </button>


            <div
              class="activity-filter-menu"
              data-filter-menu="status"
              hidden
            >
              <button
                type="button"
                data-filter-value="todos"
              >
                Todos
              </button>

              <button
                type="button"
                data-filter-value="vencidos"
              >
                Vencidos
              </button>

              <button
                type="button"
                data-filter-value="eliminados"
              >
                Eliminados
              </button>
            </div>
          </div>

        </div>

      </div>


      <!-- =============================
          LISTADO DE ACTIVIDADES
          ============================= -->
      <div
        id="remindersList"
        class="reminders-list"
      >
        <p class="empty-reminders">
          Aún no tienes recordatorios registrados.
        </p>
      </div>


      <!-- =============================
          ACCIONES DE ELIMINADOS
          ============================= -->
      <div
        id="trashBulkActions"
        class="trash-bulk-actions"
        hidden
      >
        <button
          type="button"
          class="empty-trash-button"
          onclick="emptyReminderTrash()"
        >
          <i class="fa-solid fa-trash-can"></i>
          Vaciar eliminados
        </button>
      </div>


      <!-- =============================
          PAGINACIÓN
          ============================= -->
      <div
        id="activitiesPagination"
        class="activities-pagination"
      ></div>

    </div>
  `;

  const voiceButton = document.getElementById("voiceReminderButton");
  const manualReminderForm = document.getElementById("manualReminderForm");
  
  const manualReminderDate =
  document.getElementById("manualReminderDate");

  const manualReminderDueDate =
    document.getElementById("manualReminderDueDate");

  if (manualReminderDate && manualReminderDueDate) {
    manualReminderDate.addEventListener("change", () => {
      /*
      * Solo recalculamos si la fecha límite está vacía
      * o fue generada automáticamente anteriormente.
      */
      if (
        !manualReminderDueDate.value ||
        manualReminderDueDate.dataset.autoGenerated === "true"
      ) {
        manualReminderDueDate.value =
          getLastDayOfReminderMonth(
            manualReminderDate.value
          );

        manualReminderDueDate.dataset.autoGenerated =
          "true";
      }
    });

    manualReminderDueDate.addEventListener("change", () => {
      /*
      * Si el usuario selecciona manualmente una fecha,
      * dejamos de considerarla automática.
      */
      manualReminderDueDate.dataset.autoGenerated =
        "false";
    });
  }

  if (voiceButton) {
    voiceButton.addEventListener("click", startVoiceReminder);
  }

  if (manualReminderForm) {
    manualReminderForm.addEventListener("submit", handleManualReminderSubmit);
  }

  const reminderSearchTarget = getReminderSearchTarget();

  activityDateFilter = "all";
  activityPriorityFilter = "all";

  if (
    reminderSearchTarget.status === "papelera" ||
    reminderSearchTarget.status === "completado"
  ) {
    activityStatusFilter = "eliminados";
  } else {
    activityStatusFilter = "todos";
  }

  setupReminderFilters();
  setupActivitySearch();
  loadReminders();

  if (
    typeof setupMobileActivityFormControls ===
    "function"
  ) {
    setupMobileActivityFormControls();
  }
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
    due_date: dueDate || getLastDayOfReminderMonth(reminderDate),
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

    // Sin mensaje de éxito

    const createdReminderId = data.reminder_id;

    /*
    * En Android programamos también la notificación nativa.
    * La base de datos sigue siendo la fuente principal del recordatorio.
    */
    if (
      reminderData.reminder_time &&
      typeof window.scheduleDanyBotReminderNotification === "function"
    ) {
      const notificationResult =
        await window.scheduleDanyBotReminderNotification({
          ...reminderData,
          id: createdReminderId
        });

      /*
      * En Android moderno puede ser necesario habilitar
      * manualmente "Alarmas y recordatorios".
      */
      if (
        !notificationResult.scheduled &&
        notificationResult.exactAlarmRequired
      ) {
        const exactAlarmResult = await Swal.fire({
          title: "Permitir avisos exactos",
          text:
            "Para avisarte exactamente a la hora programada, Día en Orden necesita permiso para usar alarmas y recordatorios.",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Ir a configuración",
          cancelButtonText: "Ahora no",
          confirmButtonColor: "#960018",
          cancelButtonColor: "#6b7280"
        });

        if (
          exactAlarmResult.isConfirmed &&
          typeof window.openDanyBotExactAlarmSettings === "function"
        ) {
          await window.openDanyBotExactAlarmSettings();

          /*
          * Cuando el usuario regresa desde Configuración,
          * comprobamos otra vez y reintentamos programar.
          */
          const exactPermission =
            await window.checkDanyBotExactAlarmPermission();

          if (exactPermission.granted) {
            await window.scheduleDanyBotReminderNotification({
              ...reminderData,
              id: createdReminderId
            });
          }
        }
      }
    }

pendingCreatedReminderId = createdReminderId;

    event.target.reset();
    document.getElementById("manualReminderTime").value = "07:00";

    if (
      typeof window.closeMobileActivityForm ===
      "function"
    ) {
      window.closeMobileActivityForm();
    }
    

    if (typeof currentActivitiesPage !== "undefined") {
      currentActivitiesPage = 1;
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
  const dropdowns =
    document.querySelectorAll(
      ".activity-filter-dropdown"
    );

  if (!dropdowns.length) {
    return;
  }


  function closeActivityFilterMenus() {
    document
      .querySelectorAll(
        ".activity-filter-menu"
      )
      .forEach((menu) => {
        menu.hidden = true;
      });

    document
      .querySelectorAll(
        ".activity-filter-trigger"
      )
      .forEach((trigger) => {
        trigger.classList.remove(
          "is-open"
        );
      });
  }


  function updateActivityFilterLabels() {
    const labelConfig = {
      date: {
        value: activityDateFilter,
        defaultValue: "all",
        labels: {
          all: "Fecha",
          today: "Hoy",
          week: "Esta semana",
          month: "Este mes"
        }
      },

      priority: {
        value: activityPriorityFilter,
        defaultValue: "all",
        labels: {
          all: "Prioridad",
          alta: "Alta",
          media: "Media",
          baja: "Baja"
        }
      },

      status: {
        value: activityStatusFilter,
        defaultValue: "todos",
        labels: {
          todos: "Estado",
          vencidos: "Vencidos",
          eliminados: "Eliminados"
        }
      }
    };


    dropdowns.forEach((dropdown) => {
      const group =
        dropdown.dataset.filterGroup;

      const config =
        labelConfig[group];

      if (!config) {
        return;
      }

      const label =
        dropdown.querySelector(
          `[data-filter-label="${group}"]`
        );

      const trigger =
        dropdown.querySelector(
          ".activity-filter-trigger"
        );

      const selectedValue =
        config.value;


      if (label) {
        label.textContent =
          config.labels[selectedValue] ||
          config.labels[
            config.defaultValue
          ];
      }


      dropdown
        .querySelectorAll(
          "[data-filter-value]"
        )
        .forEach((option) => {
          option.classList.toggle(
            "is-selected",
            option.dataset.filterValue ===
              selectedValue
          );
        });


      if (trigger) {
        const hasSelection =
          selectedValue !==
          config.defaultValue;

        trigger.classList.toggle(
          "has-selection",
          hasSelection
        );
      }
    });
  }


  dropdowns.forEach((dropdown) => {
    const group =
      dropdown.dataset.filterGroup;

    const trigger =
      dropdown.querySelector(
        ".activity-filter-trigger"
      );

    const menu =
      dropdown.querySelector(
        ".activity-filter-menu"
      );

    if (!trigger || !menu) {
      return;
    }


    trigger.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const shouldOpen =
          menu.hidden;

        closeActivityFilterMenus();

        if (shouldOpen) {
          menu.hidden = false;

          trigger.classList.add(
            "is-open"
          );
        }
      }
    );


    menu
      .querySelectorAll(
        "[data-filter-value]"
      )
      .forEach((option) => {
        option.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            const value =
              option.dataset.filterValue;


            if (group === "date") {
              activityDateFilter =
                value;
            }


            if (group === "priority") {
              activityPriorityFilter =
                value;
            }


            if (group === "status") {
              activityStatusFilter =
                value;
            }


            currentActivitiesPage = 1;

            closeActivityFilterMenus();

            updateActivityFilterLabels();

            renderRemindersList();
          }
        );
      });
  });


  /*
   * Evita acumular listeners si la sección
   * de Actividades se vuelve a construir.
   */
  if (
    window.activityFilterDocumentClickHandler
  ) {
    document.removeEventListener(
      "click",
      window.activityFilterDocumentClickHandler
    );
  }


  window.activityFilterDocumentClickHandler =
    () => {
      closeActivityFilterMenus();
    };


  document.addEventListener(
    "click",
    window.activityFilterDocumentClickHandler
  );


  updateActivityFilterLabels();
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

function formatActivityLocalDate(date) {
  if (!(date instanceof Date)) {
    return "";
  }

  if (Number.isNaN(date.getTime())) {
    return "";
  }


  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;
}


function getActivityWeekRange(today) {
  if (
    !today ||
    !/^\d{4}-\d{2}-\d{2}$/.test(today)
  ) {
    return {
      start: "",
      end: ""
    };
  }


  /*
   * Se usa mediodía para evitar cambios
   * de fecha por zona horaria.
   */
  const currentDate =
    new Date(
      `${today}T12:00:00`
    );


  if (
    Number.isNaN(
      currentDate.getTime()
    )
  ) {
    return {
      start: "",
      end: ""
    };
  }


  const dayOfWeek =
    currentDate.getDay();


  /*
   * Semana:
   * lunes = inicio
   * domingo = final
   */
  const daysFromMonday =
    dayOfWeek === 0
      ? 6
      : dayOfWeek - 1;


  const monday =
    new Date(currentDate);

  monday.setDate(
    currentDate.getDate() -
    daysFromMonday
  );


  const sunday =
    new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );


  return {
    start:
      formatActivityLocalDate(
        monday
      ),

    end:
      formatActivityLocalDate(
        sunday
      )
  };
}


function matchesActivityDateFilter(
  reminder,
  today
) {
  /*
   * Sin filtro de fecha.
   */
  if (
    activityDateFilter === "all"
  ) {
    return true;
  }


  const reminderDate =
    getReminderDateValue(
      reminder.reminder_date
    );


  if (!reminderDate) {
    return false;
  }


  /*
   * Hoy.
   */
  if (
    activityDateFilter === "today"
  ) {
    return reminderDate === today;
  }


  /*
   * Semana actual:
   * lunes a domingo.
   */
  if (
    activityDateFilter === "week"
  ) {
    const weekRange =
      getActivityWeekRange(today);


    if (
      !weekRange.start ||
      !weekRange.end
    ) {
      return false;
    }


    return (
      reminderDate >=
        weekRange.start &&
      reminderDate <=
        weekRange.end
    );
  }


  /*
   * Mes actual.
   */
  if (
    activityDateFilter === "month"
  ) {
    return (
      reminderDate.slice(0, 7) ===
      today.slice(0, 7)
    );
  }


  return true;
}


function matchesActivityPriorityFilter(
  reminder
) {
  if (
    activityPriorityFilter ===
    "all"
  ) {
    return true;
  }


  /*
   * Los registros antiguos sin prioridad
   * se consideran prioridad media,
   * igual que hacía la lógica anterior.
   */
  const priority =
    reminder.priority ||
    "media";


  return (
    priority ===
    activityPriorityFilter
  );
}


function matchesActivityStatusFilter(
  reminder
) {
  /*
   * Eliminados:
   * mantiene la lógica actual donde
   * papelera y completado pertenecen
   * a esta vista.
   */
  if (
    activityStatusFilter ===
    "eliminados"
  ) {
    return isReminderInTrash(
      reminder
    );
  }


  /*
   * Vencidos:
   * utiliza exactamente la misma
   * función con la que la card decide
   * si una actividad está vencida.
   */
  if (
    activityStatusFilter ===
    "vencidos"
  ) {
    return (
      reminder.status ===
        "activo" &&
      isReminderOverdue(
        reminder
      )
    );
  }


  /*
   * Todos:
   * muestra actividades activas
   * y excluye papelera/completadas.
   */
  return (
    reminder.status ===
      "activo" &&
    !isReminderInTrash(
      reminder
    )
  );
}


function getFilteredReminders() {
  const today =
    getTodayDate();


  /*
   * Partimos siempre del conjunto
   * completo recibido del backend.
   */
  const filteredReminders =
    reminders.filter(
      (reminder) => {

        const matchesStatus =
          matchesActivityStatusFilter(
            reminder
          );


        if (!matchesStatus) {
          return false;
        }


        const matchesDate =
          matchesActivityDateFilter(
            reminder,
            today
          );


        if (!matchesDate) {
          return false;
        }


        const matchesPriority =
          matchesActivityPriorityFilter(
            reminder
          );


        if (!matchesPriority) {
          return false;
        }


        const matchesSearch =
          matchesActivitySearch(
            reminder
          );


        if (!matchesSearch) {
          return false;
        }


        return true;
      }
    );


  return sortReminders(
    filteredReminders
  );
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
  if (
    activityStatusFilter ===
    "eliminados"
  ) {
    return {
      icon: "fa-trash-can",
      title:
        "No hay actividades eliminadas",
      text:
        "No se encontraron actividades eliminadas con los filtros seleccionados."
    };
  }


  if (
    activityStatusFilter ===
    "vencidos"
  ) {
    return {
      icon:
        "fa-triangle-exclamation",
      title:
        "No hay actividades vencidas",
      text:
        "No se encontraron actividades vencidas con los filtros seleccionados."
    };
  }


  if (
    activityDateFilter ===
    "today"
  ) {
    return {
      icon:
        "fa-calendar-day",
      title:
        "No hay actividades para hoy",
      text:
        "No se encontraron actividades para hoy con los filtros seleccionados."
    };
  }


  if (
    activityDateFilter ===
    "week"
  ) {
    return {
      icon:
        "fa-calendar-week",
      title:
        "No hay actividades esta semana",
      text:
        "No se encontraron actividades para esta semana con los filtros seleccionados."
    };
  }


  if (
    activityDateFilter ===
    "month"
  ) {
    return {
      icon:
        "fa-calendar",
      title:
        "No hay actividades este mes",
      text:
        "No se encontraron actividades para este mes con los filtros seleccionados."
    };
  }


  if (
    activityPriorityFilter ===
    "alta"
  ) {
    return {
      icon:
        "fa-flag",
      title:
        "No hay actividades de prioridad alta",
      text:
        "No se encontraron actividades de prioridad alta con los filtros seleccionados."
    };
  }


  if (
    activityPriorityFilter ===
    "media"
  ) {
    return {
      icon:
        "fa-flag",
      title:
        "No hay actividades de prioridad media",
      text:
        "No se encontraron actividades de prioridad media con los filtros seleccionados."
    };
  }


  if (
    activityPriorityFilter ===
    "baja"
  ) {
    return {
      icon:
        "fa-flag",
      title:
        "No hay actividades de prioridad baja",
      text:
        "No se encontraron actividades de prioridad baja con los filtros seleccionados."
    };
  }


  return {
    icon:
      "fa-bell-slash",
    title:
      "No hay actividades para mostrar",
    text:
      "Cuando registres una actividad, aparecerá aquí."
  };
}