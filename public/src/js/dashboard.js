let tasks = [];
let currentUserId = null;
let editingTaskId = null;
let currentTaskFilter = "todas";
let currentReminderFilter = "activos";
let reminders = [];
let lastDetectedReminder = null;
let currentCalendarDate = new Date();
let selectedCalendarDate = null;  
let reminderAlertInterval = null;
let reminderAlertOpen = false;
let alertedReminderKeys = new Set();

let reminderAudioContext = null;
let browserNotificationsEnabled = false;


const TASKS_API_URL = "/api/tasks";
const REMINDERS_API_URL = "/api/reminders";

window.addEventListener("DOMContentLoaded", async () => {
  const userData = localStorage.getItem("userData");

  if (!userData) {
    await Swal.fire({
      title: "Sesión no iniciada",
      text: "Por favor, inicia sesión para continuar.",
      icon: "warning",
      confirmButtonText: "Ir al login",
      confirmButtonColor: "#960018"
    });

    window.location.href = "login_google.html";
    return;
  }

  const user = JSON.parse(userData);
  currentUserId = user.id;

  const title = document.getElementById("section-title");
  const avatar = document.getElementById("user-avatar");
  const energiaCard = document.getElementById("card-energia");
  const quickTaskButton = document.getElementById("quickTaskButton");
  const quickReminderButton = document.getElementById("quickReminderButton");
  

  if (title) {
    title.textContent = `Bienvenida, ${user.name}`;
  }

  if (user.picture && avatar) {
    avatar.src = user.picture;
    avatar.style.display = "block";
  }

  updateDateTime();
  setInterval(updateDateTime, 60000);
  await loadDashboardTasksCount();
  await loadDashboardRemindersCount();

  loadAlertedReminderKeys();
  startReminderAlertChecker();

  if (energiaCard) {
    energiaCard.addEventListener("click", () => {
      window.location.href = "tuenergia.html";
    });
  }

  if (quickTaskButton) {
    quickTaskButton.addEventListener("click", () => {
      showSection("tareas");
    });
  }

  if (quickReminderButton) {
    quickReminderButton.addEventListener("click", () => {
      showSection("recordatorios");
    });
  }

  openSectionFromHash();

  window.addEventListener("hashchange", () => {
    openSectionFromHash();
  });
});

function updateDateTime() {
  const datetime = document.getElementById("datetime");

  if (!datetime) {
    return;
  }

  const now = new Date();

  const formattedDate = now.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedTime = now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit"
  });

  datetime.textContent = `${formattedDate} · ${formattedTime}`;
}

function updateSidebar(activePage = "dashboard") {
  if (typeof renderSidebar === "function") {
    renderSidebar(activePage);
  }
}

function getActiveDashboardPage() {
  const hash = window.location.hash.replace("#", "");

  const validSections = ["tareas", "recordatorios", "calendario"];

  if (validSections.includes(hash)) {
    return hash;
  }

  return "dashboard";
}

function openSectionFromHash() {
  const activePage = getActiveDashboardPage();

  if (activePage === "dashboard") {
    updateSidebar("dashboard");
    return;
  }

  showSection(activePage);
}



function showSection(section, selectedLink = null) {
  const contentEl = document.getElementById("section-content");
  const title = document.getElementById("section-title");

  updateSidebar(section);

  const sectionTitles = {
    tareas: "Tus tareas pendientes",
    motivacion: "Motivación",
    recordatorios: "Tus recordatorios",
    calendario: "Tu calendario",
    crecimiento: "Crecimiento personal",
    gastos: "Control de gastos",
    chistes: "Chistes del día"
  };

  const sectionIcons = {
    tareas: "fa-list-check",
    motivacion: "fa-lightbulb",
    recordatorios: "fa-bell",
    calendario: "fa-calendar-days",
    crecimiento: "fa-seedling",
    gastos: "fa-wallet",
    chistes: "fa-face-laugh-squint"
  };

  const selectedTitle = sectionTitles[section] || "Agenda Personal";
  const selectedIcon = sectionIcons[section] || "fa-house";

  if (title) {
    title.textContent = selectedTitle;
  }

  if (section === "tareas") {
    renderTasksSection();
    return;
  }

  if (section === "recordatorios") {
    renderRemindersSection();
    return;
  }

  if (section === "calendario") {
    renderCalendarSection();
    return;
  }

  contentEl.innerHTML = `
    <div class="section-placeholder">
      <div class="section-placeholder-icon">
        <i class="fa-solid ${selectedIcon}"></i>
      </div>

      <div>
        <span class="welcome-badge">Módulo en construcción</span>
        <h2>${selectedTitle}</h2>
        <p>
          Esta sección estará disponible próximamente. Por ahora estamos mejorando la estructura visual del dashboard.
        </p>
      </div>
    </div>
  `;
}

function renderTasksSection() {
  const contentEl = document.getElementById("section-content");

  contentEl.innerHTML = `
    <div class="tasks-section">
      <div class="tasks-header">
        <div>
          <span class="welcome-badge">Gestión de tareas</span>
          <h2>Tus tareas pendientes</h2>
          <p>
            Organiza tus actividades por prioridad, categoría y fecha límite.
          </p>
        </div>

        <button type="button" class="task-main-button">
          <i class="fa-solid fa-plus"></i>
          Nueva tarea
        </button>
      </div>

      <div class="tasks-summary">
        <div class="task-summary-card">
          <span>Pendientes</span>
          <strong>0</strong>
        </div>

        <div class="task-summary-card">
          <span>Completadas</span>
          <strong>0</strong>
        </div>

        <div class="task-summary-card">
          <span>Vencen hoy</span>
          <strong>0</strong>
        </div>
      </div>

      <div class="task-filters">
        <button type="button" class="task-filter-button active" data-filter="todas">
          Todas
        </button>

        <button type="button" class="task-filter-button" data-filter="pendiente">
          Pendientes
        </button>

        <button type="button" class="task-filter-button" data-filter="completada">
          Completadas
        </button>

        <button type="button" class="task-filter-button" data-filter="hoy">
          Vencen hoy
        </button>
      </div>

      <form class="task-form">
        <div class="form-group">
          <label for="taskTitle">Título de la tarea</label>
          <input 
            type="text" 
            id="taskTitle" 
            placeholder="Ej: Estudiar Node.js"
          >
        </div>

        <div class="form-group">
          <label for="taskCategory">Categoría</label>
          <select id="taskCategory">
            <option value="">Selecciona una categoría</option>
            <option value="Trabajo">Trabajo</option>
            <option value="Estudio">Estudio</option>
            <option value="Personal">Personal</option>
            <option value="Salud">Salud</option>
            <option value="Finanzas">Finanzas</option>
            <option value="Casa">Casa</option>
            <option value="Proyectos">Proyectos</option>
            <option value="Compras">Compras</option>
            <option value="Trámites">Trámites</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div class="form-group">
          <label for="taskPriority">Prioridad</label>
          <select id="taskPriority">
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        <div class="form-group">
          <label for="taskDueDate">Fecha límite</label>
          <input type="date" id="taskDueDate">
        </div>

        <div class="form-group full-width">
          <label for="taskDescription">Descripción</label>
          <textarea 
            id="taskDescription" 
            rows="3" 
            placeholder="Agrega detalles de la tarea..."
          ></textarea>
        </div>

        <div class="task-form-actions full-width">
          <button type="button" class="task-save-button">
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar tarea
          </button>
        </div>
      </form>

      <div class="tasks-list">
        <div class="empty-tasks">
          <i class="fa-solid fa-clipboard-list"></i>
          <h3>Aún no tienes tareas registradas</h3>
          <p>Cuando agregues una tarea, aparecerá en esta sección.</p>
        </div>
      </div>
    </div>
  `;

  const taskSaveButton = document.querySelector(".task-save-button");
  const taskMainButton = document.querySelector(".task-main-button");

  if (taskSaveButton) {
    taskSaveButton.addEventListener("click", saveTask);
  }

  if (taskMainButton) {
    taskMainButton.addEventListener("click", startNewTask);
  }
  setupTaskFilters();
  loadTasks();
  }

function setupTaskFilters() {
  const filterButtons = document.querySelectorAll(".task-filter-button");

  filterButtons.forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.filter === currentTaskFilter) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      currentTaskFilter = button.dataset.filter;

      filterButtons.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      renderTasksList();
    });
  });
}

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isTaskOverdue(task) {
  const today = getTodayDate();

  return task.status === "pendiente" && task.dueDate < today;
}

function getPriorityValue(priority) {
  const priorities = {
    Alta: 1,
    Media: 2,
    Baja: 3
  };

  return priorities[priority] || 4;
}

function sortTasks(taskList) {
  return [...taskList].sort((a, b) => {
    // Primero pendientes, luego completadas
    if (a.status !== b.status) {
      return a.status === "pendiente" ? -1 : 1;
    }

    // Luego fecha límite más cercana
    if (a.dueDate !== b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }

    // Luego prioridad: Alta, Media, Baja
    return getPriorityValue(a.priority) - getPriorityValue(b.priority);
  });
}

function getFilteredTasks() {
  const today = getTodayDate();

  let filteredTasks = tasks;

  if (currentTaskFilter === "pendiente") {
    filteredTasks = tasks.filter((task) => task.status === "pendiente");
  }

  if (currentTaskFilter === "completada") {
    filteredTasks = tasks.filter((task) => task.status === "completada");
  }

  if (currentTaskFilter === "hoy") {
    filteredTasks = tasks.filter((task) => {
      return task.dueDate === today && task.status === "pendiente";
    });
  }

  return sortTasks(filteredTasks);
}

async function loadTasks() {
  if (!currentUserId) {
    return;
  }

  try {
    const response = await fetch(`${TASKS_API_URL}?user_id=${currentUserId}`);
    const data = await response.json();

    if (!response.ok) {
      Swal.fire({
        title: "No se pudieron cargar",
        text: data.mensaje || "No se pudieron consultar las tareas.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    tasks = data.tareas.map((task) => {
      return {
        id: task.id,
        user_id: task.user_id,
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        dueDate: task.due_date.split("T")[0],
        status: task.status
      };
    });

    renderTasksList();
    updateTasksSummary();
    updateDashboardTasksCount();

  } catch (error) {
    console.error("Error al consultar tareas:", error);
    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al consultar las tareas.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

async function saveTask() {
  const taskTitle = document.getElementById("taskTitle");
  const taskCategory = document.getElementById("taskCategory");
  const taskPriority = document.getElementById("taskPriority");
  const taskDueDate = document.getElementById("taskDueDate");
  const taskDescription = document.getElementById("taskDescription");

  const isEditing = editingTaskId !== null;

  const currentTask = isEditing
    ? tasks.find((task) => task.id === editingTaskId)
    : null;

  const taskData = {
    user_id: currentUserId,
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim(),
    category: taskCategory.value,
    priority: taskPriority.value,
    due_date: taskDueDate.value,
    status: currentTask ? currentTask.status : "pendiente"
  };

  if (!taskData.user_id) {
    Swal.fire({
      title: "Sesión no válida",
      text: "No se encontró el usuario de la sesión.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  if (!taskData.title || !taskData.category || !taskData.due_date) {
    Swal.fire({
      title: "Datos incompletos",
      text: "Completa el título, la categoría y la fecha límite.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const url = isEditing
    ? `${TASKS_API_URL}/${editingTaskId}`
    : TASKS_API_URL;

  const method = isEditing ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (!response.ok) {
      Swal.fire({
      title: "No se pudo procesar",
      text: data.mensaje || "No se pudo procesar la tarea.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
      return;
    }

    resetTaskForm();

    await loadTasks();

    Swal.fire({
      title: isEditing ? "Tarea actualizada" : "Tarea guardada",
      text: isEditing
        ? "La tarea fue actualizada correctamente."
        : "La tarea fue registrada correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

  } catch (error) {
    console.error("Error al procesar tarea:", error);
    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al procesar la tarea.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function resetTaskForm() {
  const taskTitle = document.getElementById("taskTitle");
  const taskCategory = document.getElementById("taskCategory");
  const taskPriority = document.getElementById("taskPriority");
  const taskDueDate = document.getElementById("taskDueDate");
  const taskDescription = document.getElementById("taskDescription");
  const taskSaveButton = document.querySelector(".task-save-button");

  taskTitle.value = "";
  taskCategory.value = "";
  taskPriority.value = "Media";
  taskDueDate.value = "";
  taskDescription.value = "";

  editingTaskId = null;

  if (taskSaveButton) {
    taskSaveButton.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      Guardar tarea
    `;
  }
}

function startNewTask() {
  resetTaskForm();

  const taskForm = document.querySelector(".task-form");
  const taskTitle = document.getElementById("taskTitle");

  if (taskForm) {
    taskForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (taskTitle) {
    taskTitle.focus();
  }
}

function getEmptyTasksMessage() {
  if (currentTaskFilter === "pendiente") {
    return {
      icon: "fa-clock",
      title: "No tienes tareas pendientes",
      text: "Cuando agregues una tarea pendiente, aparecerá en esta sección."
    };
  }

  if (currentTaskFilter === "completada") {
    return {
      icon: "fa-circle-check",
      title: "No tienes tareas completadas",
      text: "Cuando completes una tarea, aparecerá en esta sección."
    };
  }

  if (currentTaskFilter === "hoy") {
    return {
      icon: "fa-calendar-day",
      title: "No tienes tareas para hoy",
      text: "Las tareas pendientes con fecha de hoy aparecerán aquí."
    };
  }

  return {
    icon: "fa-clipboard-list",
    title: "Aún no tienes tareas registradas",
    text: "Cuando agregues una tarea, aparecerá en esta sección."
  };
}

function renderTasksList() {
  const tasksList = document.querySelector(".tasks-list");

  if (!tasksList) {
    return;
  }
  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    const emptyMessage = getEmptyTasksMessage();

    tasksList.innerHTML = `
      <div class="empty-tasks">
        <i class="fa-solid ${emptyMessage.icon}"></i>
        <h3>${emptyMessage.title}</h3>
        <p>${emptyMessage.text}</p>
      </div>
    `;
    return;
  }

  tasksList.innerHTML = "";

  filteredTasks.forEach((task) => {
    const taskCard = document.createElement("div");

    taskCard.classList.add("task-card");

    if (task.status === "completada") {
      taskCard.classList.add("task-completed");
    }

    if (isTaskOverdue(task)) {
      taskCard.classList.add("task-overdue");
    }

    taskCard.innerHTML = `
      <div class="task-card-main">
        <div>
          <h3>${task.title}</h3>
          <p>${task.description || "Sin descripción"}</p>
        </div>

        <span class="task-priority priority-${task.priority.toLowerCase()}">
          ${task.priority}
        </span>
      </div>

      <div class="task-card-footer">
        <span>
          <i class="fa-solid fa-tag"></i>
          ${task.category}
        </span>

        <span>
          <i class="fa-solid fa-calendar-day"></i>
          ${task.dueDate}
        </span>

        <span class="task-status ${
          isTaskOverdue(task) 
            ? "status-vencida" 
            : `status-${task.status}`
        }">
          <i class="fa-solid ${
            task.status === "completada"
              ? "fa-circle-check"
              : isTaskOverdue(task)
                ? "fa-triangle-exclamation"
                : "fa-clock"
          }"></i>
          ${
            task.status === "completada"
              ? "Completada"
              : isTaskOverdue(task)
                ? "Vencida"
                : "Pendiente"
          }
        </span>
      </div>

      <div class="task-card-actions">
        <button 
          type="button" 
          class="${task.status === "completada" ? "task-reopen-button" : "task-complete-button"}"
          onclick="toggleTaskStatus(${task.id})"
        >
          <i class="fa-solid ${task.status === "completada" ? "fa-rotate-left" : "fa-check"}"></i>
          ${task.status === "completada" ? "Reabrir" : "Completar"}
        </button>

        <button 
          type="button" 
          class="task-edit-button"
          onclick="startEditTask(${task.id})"
        >
          <i class="fa-solid fa-pen"></i>
          Editar
        </button>

        <button 
          type="button" 
          class="task-delete-button"
          onclick="deleteTask(${task.id})"
        >
          <i class="fa-solid fa-trash"></i>
          Eliminar
        </button>
      </div>
    `;

    tasksList.appendChild(taskCard);
  });
}

function startEditTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    Swal.fire({
      title: "Tarea no encontrada",
      text: "No se encontró la tarea para editar.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  editingTaskId = task.id;

  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskCategory").value = task.category;
  document.getElementById("taskPriority").value = task.priority;
  document.getElementById("taskDueDate").value = task.dueDate;
  document.getElementById("taskDescription").value = task.description || "";

  const taskSaveButton = document.querySelector(".task-save-button");

  if (taskSaveButton) {
    taskSaveButton.innerHTML = `
      <i class="fa-solid fa-pen-to-square"></i>
      Actualizar tarea
    `;
  }

  document.querySelector(".task-form").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function toggleTaskStatus(taskId) {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  const newStatus = task.status === "completada" ? "pendiente" : "completada";

  const updatedTask = {
    user_id: currentUserId,
    title: task.title,
    description: task.description || "",
    category: task.category,
    priority: task.priority,
    due_date: task.dueDate,
    status: newStatus
  };

  try {
    const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedTask)
    });

    const data = await response.json();

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo actualizar",
        text: data.mensaje || "No se pudo actualizar el estado de la tarea.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await loadTasks();

  } catch (error) {
    console.error("Error al actualizar estado de tarea:", error);
    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al actualizar el estado de la tarea.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

async function deleteTask(taskId) {
  const result = await Swal.fire({
    title: "¿Eliminar tarea?",
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
    const response = await fetch(`${TASKS_API_URL}/${taskId}?user_id=${currentUserId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo eliminar",
        text: data.mensaje || "No se pudo eliminar la tarea.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await loadTasks();

    Swal.fire({
      title: "Tarea eliminada",
      text: "La tarea fue eliminada correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

  } catch (error) {
    console.error("Error al eliminar tarea:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al eliminar la tarea.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function updateTasksSummary() {
  const summaryCards = document.querySelectorAll(".task-summary-card strong");

  if (summaryCards.length < 3) {
    return;
  }

  const pendingTasks = tasks.filter((task) => task.status === "pendiente").length;
  const completedTasks = tasks.filter((task) => task.status === "completada").length;

  const today = getTodayDate();

  const todayTasks = tasks.filter((task) => {
    return task.dueDate === today && task.status === "pendiente";
  }).length;

  summaryCards[0].textContent = pendingTasks;
  summaryCards[1].textContent = completedTasks;
  summaryCards[2].textContent = todayTasks;
}

function updateDashboardTasksCount() {
  const totalTasksCount = document.getElementById("totalTasksCount");

  if (!totalTasksCount) {
    return;
  }

  totalTasksCount.textContent = tasks.length;
}

function updateDashboardRemindersCount() {
  const activeRemindersCount = document.getElementById("activeRemindersCount");

  if (!activeRemindersCount) {
    return;
  }

  const activeReminders = reminders.filter((reminder) => {
    return reminder.status === "activo";
  });

  activeRemindersCount.textContent = activeReminders.length;
}

function updateDashboardTodayEventsCount() {
  const todayEventsCount = document.getElementById("todayEventsCount");

  if (!todayEventsCount) {
    return;
  }

  const today = getTodayDate();

  const todayReminders = reminders.filter((reminder) => {
    return getReminderDateValue(reminder.reminder_date) === today
      && reminder.status === "activo";
  });

  todayEventsCount.textContent = todayReminders.length;
}

async function loadDashboardRemindersCount() {
  if (!currentUserId) {
    return;
  }

  try {
    const response = await fetch(`${REMINDERS_API_URL}?user_id=${currentUserId}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("No se pudieron cargar los recordatorios del dashboard:", data);
      updateDashboardRemindersCount();
      return;
    }

    reminders = data.reminders || [];
    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();

  } catch (error) {
    console.error("Error al cargar el contador de recordatorios:", error);
    updateDashboardRemindersCount();
  }
}
async function loadDashboardTasksCount() {
  if (!currentUserId) {
    return;
  }

  try {
    const response = await fetch(`${TASKS_API_URL}?user_id=${currentUserId}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("No se pudieron cargar las tareas del dashboard:", data);
      updateDashboardTasksCount();
      return;
    }

    tasks = data.tareas.map((task) => {
      return {
        id: task.id,
        user_id: task.user_id,
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        dueDate: task.due_date.split("T")[0],
        status: task.status
      };
    });

    updateDashboardTasksCount();

  } catch (error) {
    console.error("Error al cargar el contador de tareas:", error);
    updateDashboardTasksCount();
  }
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
  if (!currentUserId) {
    return;
  }

  try {
    const response = await fetch(`${REMINDERS_API_URL}?user_id=${currentUserId}`);
    const data = await response.json();

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
    return getReminderDateValue(reminder.reminder_date) === dateKey;
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

function formatReminderTime(timeValue) {
  if (!timeValue) {
    return "Sin hora";
  }

  const [hour, minute] = timeValue.split(":");
  const date = new Date();
  date.setHours(Number(hour));
  date.setMinutes(Number(minute));

  return date.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatRepeatType(repeatType) {
  const types = {
    una_vez: "Una vez",
    diario: "Diario",
    semanal: "Semanal",
    mensual: "Mensual"
  };

  return types[repeatType] || "Una vez";
}

function getRepeatTypeClass(repeatType) {
  const cleanRepeatType = repeatType || "una_vez";

  if (cleanRepeatType === "diario") {
    return "repeat-daily";
  }

  if (cleanRepeatType === "semanal") {
    return "repeat-weekly";
  }

  if (cleanRepeatType === "mensual") {
    return "repeat-monthly";
  }

  return "repeat-once";
}

function getRepeatTypeIcon(repeatType) {
  const cleanRepeatType = repeatType || "una_vez";

  if (cleanRepeatType === "diario") {
    return "fa-sun";
  }

  if (cleanRepeatType === "semanal") {
    return "fa-calendar-week";
  }

  if (cleanRepeatType === "mensual") {
    return "fa-calendar-days";
  }

  return "fa-circle-dot";
}

function renderRemindersSection() {
  const contentEl = document.getElementById("section-content");

  contentEl.innerHTML = `
    <div class="voice-reminders-section">
      <div class="voice-reminders-header">
        <div>
          <span class="welcome-badge">Recordatorios por voz</span>
          <h2>Habla y crea tu recordatorio</h2>
          <p>
            Presiona el micrófono y di algo como:
            “Recuérdame pagar el internet mañana a las 8 de la noche”.
          </p>
        </div>

        <button type="button" id="enableReminderAlertsButton" class="enable-alerts-button">
          <i class="fa-solid fa-volume-high"></i>
          Activar alertas
        </button>
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

  if (voiceButton) {
    voiceButton.addEventListener("click", startVoiceReminder);
  }

  if (enableAlertsButton) {
    enableAlertsButton.addEventListener("click", enableReminderAlerts);
  }

  setupReminderFilters();
  loadReminders();
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

function getFilteredReminders() {
  const today = getTodayDate();

  let filteredReminders = reminders;

  if (currentReminderFilter === "activos") {
    filteredReminders = reminders.filter((reminder) => {
      return reminder.status === "activo";
    });
  }

  if (currentReminderFilter === "hoy") {
    filteredReminders = reminders.filter((reminder) => {
      return getReminderDateValue(reminder.reminder_date) === today
        && reminder.status === "activo";
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

function startVoiceReminder() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const statusText = document.getElementById("voiceReminderStatus");
  const voiceButton = document.getElementById("voiceReminderButton");

  if (!SpeechRecognition) {
    Swal.fire({
      title: "Micrófono no compatible",
      text: "Tu navegador no soporta reconocimiento de voz. Prueba en Google Chrome.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "es-CO";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = "";
  let interimTranscript = "";
  let silenceTimer = null;
  let maxListenTimer = null;
  let alreadyProcessed = false;

  function getFullTranscript() {
    return `${finalTranscript} ${interimTranscript}`
      .replace(/\s+/g, " ")
      .trim();
  }

  function resetVoiceButton() {
    if (voiceButton) {
      voiceButton.classList.remove("listening");
      voiceButton.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
    }
  }

  function clearVoiceTimers() {
    clearTimeout(silenceTimer);
    clearTimeout(maxListenTimer);
  }

  async function finishVoiceReminder() {
    if (alreadyProcessed) {
      return;
    }

    alreadyProcessed = true;
    clearVoiceTimers();
    resetVoiceButton();

    try {
      recognition.stop();
    } catch (error) {
      console.warn("El reconocimiento ya estaba detenido.");
    }

    const spokenText = getFullTranscript();

    if (!spokenText) {
      if (statusText) {
        statusText.textContent = "No detecté texto. Intenta de nuevo.";
      }

      return;
    }

    if (statusText) {
      statusText.textContent = `"${spokenText}"`;
    }

    await processCompletedVoiceReminder(spokenText);
  }

  if (statusText) {
    statusText.textContent = "Escuchando... habla tu recordatorio completo.";
  }

  if (voiceButton) {
    voiceButton.classList.add("listening");
    voiceButton.innerHTML = `<i class="fa-solid fa-microphone-lines"></i>`;
  }

  recognition.start();

  recognition.onresult = (event) => {
    interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptPart = event.results[i][0].transcript.trim();

      if (event.results[i].isFinal) {
        finalTranscript += ` ${transcriptPart}`;
      } else {
        interimTranscript += ` ${transcriptPart}`;
      }
    }

    const visibleText = getFullTranscript();

    if (statusText) {
      statusText.textContent = visibleText
        ? `"${visibleText}"`
        : "Escuchando... habla tu recordatorio completo.";
    }

    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
      finishVoiceReminder();
    }, 2500);
  };

  recognition.onerror = () => {
    alreadyProcessed = true;
    clearVoiceTimers();
    resetVoiceButton();

    if (statusText) {
      statusText.textContent = "No pude escuchar bien. Intenta de nuevo.";
    }

    Swal.fire({
      title: "No se pudo escuchar",
      text: "Revisa el permiso del micrófono o intenta nuevamente.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  };

  recognition.onend = () => {
    if (!alreadyProcessed) {
      finishVoiceReminder();
    }
  };

  maxListenTimer = setTimeout(() => {
    finishVoiceReminder();
  }, 12000);
}

async function processCompletedVoiceReminder(spokenText) {
  const detectedReminder = parseReminderFromVoice(spokenText);

  lastDetectedReminder = detectedReminder;

  renderDetectedReminder(detectedReminder);

  if (!detectedReminder.reminder_date) {
    Swal.fire({
      title: "Falta la fecha",
      text: "No pude detectar una fecha clara. Intenta decir algo como: recuérdame pagar internet mañana a las 8 de la noche.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  if (!detectedReminder.reminder_time) {
    Swal.fire({
      title: "Falta la hora",
      text: "Para poder avisarte, necesito una hora. Intenta decir algo como: hoy a las 4:54 de la tarde.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  await saveVoiceReminder(detectedReminder);
}

function parseReminderFromVoice(text) {
  const originalText = text;
  const normalizedText = normalizeText(text);

  let reminderDate = detectReminderDate(normalizedText);
  let reminderTime = detectReminderTime(normalizedText, reminderDate || getTodayDate());

  if (!reminderDate && reminderTime) {
    reminderDate = getDateForTimeOnly(reminderTime);
    reminderTime = detectReminderTime(normalizedText, reminderDate);
  }

  const category = detectReminderCategory(normalizedText);
  const repeatType = detectRepeatType(normalizedText);
  const title = detectReminderTitle(normalizedText);

  return {
    user_id: currentUserId,
    title,
    original_text: originalText,
    reminder_date: reminderDate,
    reminder_time: reminderTime,
    category,
    repeat_type: repeatType,
    status: "activo"
  };
}

function getDateForTimeOnly(reminderTime) {
  const today = new Date();

  const [hour, minute] = reminderTime.split(":");

  const reminderDateTime = new Date();
  reminderDateTime.setHours(Number(hour));
  reminderDateTime.setMinutes(Number(minute));
  reminderDateTime.setSeconds(0);
  reminderDateTime.setMilliseconds(0);

  if (reminderDateTime < today) {
    reminderDateTime.setDate(reminderDateTime.getDate() + 1);
  }

  return formatDateForDatabase(reminderDateTime);
}


function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bp\s*\.?\s*m\s*\.?\b/g, "pm")
    .replace(/\ba\s*\.?\s*m\s*\.?\b/g, "am")
    .replace(/\s+/g, " ")
    .trim();
}

function detectReminderTitle(text) {
  let title = text.toLowerCase().trim();

  title = title
    .replace(/\b(recuerdame|recordarme|recordame|acuerdame|acuérdame|dejame|déjame)\b/g, "")
    .replace(/\b(que debo|debo|tengo que|quiero que me recuerdes|necesito que me recuerdes|necesito que|quiero)\b/g, "")  
    .replace(/\b(recordatorio|agenda)\b/g, "")
    .trim();

  title = extractTitleAfterDate(title);

  title = title
    .replace(/\ba las\s+\d{1,2}(?:(?::|\s+y\s+|\s+con\s+)\d{1,2})?\s*(de la manana|por la manana|de la tarde|de la noche|am|pm)?/g, "")
    .replace(/\b\d{1,2}(?:(?::|\s+y\s+|\s+con\s+)\d{1,2})\s*(am|pm)?\b/g, "")
    .replace(/\b\d{1,2}\s*(am|pm|a m|p m)\b/g, "")
    .replace(/\bhoy\b/g, "")
    .replace(/\bpasado manana\b/g, "")
    .replace(/\bmanana\b/g, "")
    .replace(/\bel lunes\b/g, "")
    .replace(/\bel martes\b/g, "")
    .replace(/\bel miercoles\b/g, "")
    .replace(/\bel jueves\b/g, "")
    .replace(/\bel viernes\b/g, "")
    .replace(/\bel sabado\b/g, "")
    .replace(/\bel domingo\b/g, "")
    .replace(/\blunes\b/g, "")
    .replace(/\bmartes\b/g, "")
    .replace(/\bmiercoles\b/g, "")
    .replace(/\bjueves\b/g, "")
    .replace(/\bviernes\b/g, "")
    .replace(/\bsabado\b/g, "")
    .replace(/\bdomingo\b/g, "")
    .replace(/\bpara el dia\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bpara el\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bel dia\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bel\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\b\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bpara el dia\s+\d{1,2}\b/g, "")
    .replace(/\bpara el\s+\d{1,2}\b/g, "")
    .replace(/\bel dia\s+\d{1,2}\b/g, "")
    .replace(/\bel\s+\d{1,2}\b/g, "")
    .replace(/\btodos los dias\b/g, "")
    .replace(/\bcada dia\b/g, "")
    .replace(/\bdiariamente\b/g, "")
    .replace(/\ba diario\b/g, "")
    .replace(/\bcada semana\b/g, "")
    .replace(/\bsemanalmente\b/g, "")
    .replace(/\bsemanal\b/g, "")
    .replace(/\btodos los meses\b/g, "")
    .replace(/\bcada mes\b/g, "")
    .replace(/\bmensualmente\b/g, "")
    .replace(/\bmensual\b/g, "")
    .replace(/\bcada 1 mes\b/g, "")
    .replace(/\bcada un mes\b/g, "")
    .replace(/\buna vez al mes\b/g, "")
    .replace(/\buna vez por mes\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  title = title.replace(/^para\s+/g, "").trim();

  if (!title || title.length <= 2) {
    return "Recordatorio";
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function extractTitleAfterDate(text) {
  const monthNames = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

  const dateBeforeActionMatch = text.match(
    new RegExp(`^(?:el dia\\s+|el\\s+|dia\\s+)?\\d{1,2}\\s*(?:de\\s+)?(${monthNames})\\s+para\\s+(.+)$`)
  );

  if (dateBeforeActionMatch) {
    return dateBeforeActionMatch[2].trim();
  }

  const relativeBeforeActionMatch = text.match(/^(hoy|manana|pasado manana)\s+(.+)$/);

  if (relativeBeforeActionMatch) {
    return relativeBeforeActionMatch[2].trim();
  }

  return text;
}

function detectReminderDate(text) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (text.includes("hoy")) {
    return formatDateForDatabase(todayStart);
  }

  if (text.includes("pasado manana")) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() + 2);
    return formatDateForDatabase(date);
  }

  if (isTomorrowDateExpression(text)) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() + 1);
    return formatDateForDatabase(date);
  }

  const explicitMonthDate = detectDateWithMonthName(text, todayStart);

  if (explicitMonthDate) {
    return explicitMonthDate;
  }

  const numericDate = detectNumericDate(text, todayStart);

  if (numericDate) {
    return numericDate;
  }

  const weekDays = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6
  };

  for (const dayName in weekDays) {
    if (text.includes(dayName)) {
      return getNextWeekdayDate(weekDays[dayName]);
    }
  }

  const dayMatch = text.match(/\b(?:para el dia|para el|el dia|el)\s+(\d{1,2})\b/);

  if (dayMatch) {
    const day = Number(dayMatch[1]);
    const date = new Date(todayStart);

    date.setDate(day);

    if (date < todayStart) {
      date.setMonth(date.getMonth() + 1);
    }

    return formatDateForDatabase(date);
  }

  return null;
}
function isTomorrowDateExpression(text) {
  const textWithoutMorningExpression = text
    .replace("de la manana", "")
    .replace("por la manana", "")
    .replace("en la manana", "");

  return textWithoutMorningExpression.includes("manana");
}

function getMonthNumber(monthName) {
  const months = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11
  };

  return months[monthName];
}

function detectDateWithMonthName(text, todayStart) {
  const monthNames = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

  const dateMatch = text.match(
    new RegExp(`(?:el dia\\s+|el\\s+|dia\\s+)?(\\d{1,2})\\s*(?:de\\s+)?(${monthNames})\\b`)
  );

  if (!dateMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = getMonthNumber(dateMatch[2]);

  if (!isValidDayMonth(day, month)) {
    return null;
  }

  let year = todayStart.getFullYear();
  let date = new Date(year, month, day);

  if (date < todayStart) {
    year += 1;
    date = new Date(year, month, day);
  }

  return formatDateForDatabase(date);
}

function detectNumericDate(text, todayStart) {
  const numericDateMatch = text.match(/(?:el\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);

  if (!numericDateMatch) {
    return null;
  }

  const day = Number(numericDateMatch[1]);
  const month = Number(numericDateMatch[2]) - 1;
  let year = numericDateMatch[3] ? Number(numericDateMatch[3]) : todayStart.getFullYear();

  if (year < 100) {
    year += 2000;
  }

  if (!isValidDayMonth(day, month)) {
    return null;
  }

  let date = new Date(year, month, day);

  if (!numericDateMatch[3] && date < todayStart) {
    date = new Date(year + 1, month, day);
  }

  return formatDateForDatabase(date);
}

function isValidDayMonth(day, month) {
  if (month < 0 || month > 11) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  const testDate = new Date(2028, month, day);

  return testDate.getMonth() === month && testDate.getDate() === day;
}

function detectReminderTime(text, reminderDate = null) {
  let hour = null;
  let minutes = 0;

  const cleanText = normalizeText(text);

  const timeWithLasMatch = cleanText.match(
    /a las\s+(\d{1,2})(?:(?::|\s+y\s+|\s+con\s+)(\d{1,2}))?\s*(am|pm)?\b/
  );

  const timeWithoutLasMatch = cleanText.match(
    /\b(\d{1,2})(?:(?::|\s+y\s+|\s+con\s+)(\d{1,2}))\s*(am|pm)?\b/
  );

  const simpleAmPmMatch = cleanText.match(
    /\b(\d{1,2})\s*(am|pm)\b/
  );

  const simpleHourWithDayPartMatch = cleanText.match(
    /\b(\d{1,2})\s*(de la manana|por la manana|de la tarde|de la noche)\b/
  );

  if (timeWithLasMatch) {
    hour = Number(timeWithLasMatch[1]);
    minutes = timeWithLasMatch[2] ? Number(timeWithLasMatch[2]) : 0;
  } else if (timeWithoutLasMatch) {
    hour = Number(timeWithoutLasMatch[1]);
    minutes = timeWithoutLasMatch[2] ? Number(timeWithoutLasMatch[2]) : 0;
  } else if (simpleAmPmMatch) {
    hour = Number(simpleAmPmMatch[1]);
    minutes = 0;
  } else if (simpleHourWithDayPartMatch) {
    hour = Number(simpleHourWithDayPartMatch[1]);
    minutes = 0;
  } else {
    const spokenHour = detectSpokenHour(cleanText);

    if (!spokenHour) {
      return null;
    }

    hour = spokenHour;
  }

  if (hour < 1 || hour > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const saysPm =
    cleanText.includes("de la tarde") ||
    cleanText.includes("de la noche") ||
    /\bpm\b/.test(cleanText);

  const saysAm =
    cleanText.includes("de la manana") ||
    cleanText.includes("por la manana") ||
    /\bam\b/.test(cleanText);

  if (saysPm && hour < 12) {
    hour += 12;
  }

  if (saysAm && hour === 12) {
    hour = 0;
  }

  const isToday =
    reminderDate === getTodayDate() ||
    cleanText.includes("hoy");

  if (!saysPm && !saysAm && isToday && hour >= 1 && hour <= 11) {
    const now = new Date();

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const morningAlreadyPassed =
      currentHour > hour ||
      (currentHour === hour && currentMinute >= minutes);

    if (morningAlreadyPassed || currentHour >= 12) {
      hour += 12;
    }
  }

  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function detectSpokenHour(text) {
  const hourWords = {
    una: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12
  };

  const spokenMatch = text.match(/a las\s+(una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/);

  if (!spokenMatch) {
    return null;
  }

  return hourWords[spokenMatch[1]];
}

function detectReminderCategory(text) {
  const financeWords = ["pagar", "factura", "arriendo", "tarjeta", "internet", "servicio", "gasto", "ahorro"];
  const studyWords = ["estudiar", "repasar", "curso", "clase", "backend", "frontend", "ingles"];
  const healthWords = ["medico", "cita", "doctor", "salud", "medicina", "ejercicio"];
  const workWords = ["reunion", "informe", "correo", "ticket", "trabajo", "cliente"];

  if (financeWords.some((word) => text.includes(word))) {
    return "Finanzas";
  }

  if (studyWords.some((word) => text.includes(word))) {
    return "Estudio";
  }

  if (healthWords.some((word) => text.includes(word))) {
    return "Salud";
  }

  if (workWords.some((word) => text.includes(word))) {
    return "Trabajo";
  }

  return "Personal";
}

function detectRepeatType(text) {
  const cleanText = normalizeText(text);

  const dailyPatterns = [
    "todos los dias",
    "todas los dias",
    "cada dia",
    "diariamente",
    "a diario",
    "todos los dias de la semana"
  ];

  const weeklyPatterns = [
    "cada semana",
    "semanal",
    "semanalmente",
    "todas las semanas",
    "todos los lunes",
    "todos los martes",
    "todos los miercoles",
    "todos los jueves",
    "todos los viernes",
    "todos los sabados",
    "todos los domingos",
    "cada lunes",
    "cada martes",
    "cada miercoles",
    "cada jueves",
    "cada viernes",
    "cada sabado",
    "cada domingo"
  ];

  const monthlyPatterns = [
    "cada mes",
    "cada mensualidad",
    "mensual",
    "mensualmente",
    "todos los meses",
    "cada 1 mes",
    "cada un mes",
    "una vez al mes",
    "una vez por mes",
    "mes a mes"
  ];

  if (dailyPatterns.some((pattern) => cleanText.includes(pattern))) {
    return "diario";
  }

  if (weeklyPatterns.some((pattern) => cleanText.includes(pattern))) {
    return "semanal";
  }

  if (monthlyPatterns.some((pattern) => cleanText.includes(pattern))) {
    return "mensual";
  }

  return "una_vez";
}

function getRepeatTypeClass(repeatType) {
  const cleanRepeatType = repeatType || "una_vez";

  if (cleanRepeatType === "diario") {
    return "repeat-daily";
  }

  if (cleanRepeatType === "semanal") {
    return "repeat-weekly";
  }

  if (cleanRepeatType === "mensual") {
    return "repeat-monthly";
  }

  return "repeat-once";
}

function getRepeatTypeIcon(repeatType) {
  const cleanRepeatType = repeatType || "una_vez";

  if (cleanRepeatType === "diario") {
    return "fa-sun";
  }

  if (cleanRepeatType === "semanal") {
    return "fa-calendar-week";
  }

  if (cleanRepeatType === "mensual") {
    return "fa-calendar-days";
  }

  return "fa-circle-dot";
}

function getNextWeekdayDate(targetDay) {
  const date = new Date();
  const currentDay = date.getDay();

  let daysUntilTarget = targetDay - currentDay;

  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }

  date.setDate(date.getDate() + daysUntilTarget);

  return formatDateForDatabase(date);
}

function formatDateForDatabase(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function saveVoiceReminder(reminderData) {
  try {
    const response = await fetch(REMINDERS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reminderData)
    });

    const data = await response.json();

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo guardar",
        text: data.mensaje || "No se pudo guardar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await Swal.fire({
      title: "Recordatorio creado",
      text: "Tu recordatorio fue guardado correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

    await loadReminders();

  } catch (error) {
    console.error("Error al guardar recordatorio:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al guardar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

async function loadReminders() {
  if (!currentUserId) {
    return;
  }

  try {
    const response = await fetch(`${REMINDERS_API_URL}?user_id=${currentUserId}`);
    const data = await response.json();

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

function getReminderDateValue(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).split("T")[0];
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
        user_id: currentUserId,
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result.value)
    });

    const data = await response.json();

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
    const response = await fetch(`${REMINDERS_API_URL}/${reminderId}?user_id=${currentUserId}`, {
      method: "DELETE"
    });

    const data = await response.json();

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
    user_id: currentUserId,
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedReminder)
    });

    const data = await response.json();

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
    const response = await fetch(`${REMINDERS_API_URL}/${reminderId}/permanent?user_id=${currentUserId}`, {
      method: "DELETE"
    });

    const data = await response.json();

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
    reminder.repeat_type === "mensual";
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
    user_id: currentUserId,
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedReminder)
    });

    const data = await response.json();

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

function logout() {
  localStorage.removeItem("userData");
  window.location.href = "login_google.html";
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
  if (!currentUserId) {
    return;
  }

  try {
    const response = await fetch(`${REMINDERS_API_URL}?user_id=${currentUserId}`);
    const data = await response.json();

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

  if (!("Notification" in window)) {
    Swal.fire({
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