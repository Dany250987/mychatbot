let tasks = [];
let currentUserId = null;
let editingTaskId = null;
let currentTaskFilter = "todas";

const TASKS_API_URL = "/api/tasks";

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
  updateDashboardTasksCount();

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

function activateMenuLink(section) {
  const menuLinks = document.querySelectorAll(".menu-link");

  menuLinks.forEach((link) => {
    link.classList.remove("active");

    const onclickValue = link.getAttribute("onclick");

    if (onclickValue && onclickValue.includes(`'${section}'`)) {
      link.classList.add("active");
    }
  });
}

function showSection(section, selectedLink = null) {
  const contentEl = document.getElementById("section-content");
  const title = document.getElementById("section-title");

  const menuLinks = document.querySelectorAll(".menu-link");

  menuLinks.forEach((link) => {
    link.classList.remove("active");
  });

  if (selectedLink) {
   const menuLinks = document.querySelectorAll(".menu-link");

    menuLinks.forEach((link) => {
    link.classList.remove("active");
  });

    selectedLink.classList.add("active");
  } else {
    activateMenuLink(section);
  }

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

  const selectedTitle = sectionTitles[section] || "DanyBot";
  const selectedIcon = sectionIcons[section] || "fa-robot";

  if (title) {
    title.textContent = selectedTitle;
  }

  if (section === "tareas") {
    renderTasksSection();
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

function logout() {
  localStorage.removeItem("userData");
  window.location.href = "login_google.html";
}