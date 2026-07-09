// ===============================
// Seguridad con token para tareas
// ===============================

function getTaskAuthToken() {
  return localStorage.getItem("authToken");
}

function getTaskAuthHeaders(includeJsonContent = false) {
  const token = getTaskAuthToken();

  const headers = {
    Authorization: `Bearer ${token}`
  };

  if (includeJsonContent) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

let hasHighlightedTaskSearchResult = false;

function getTaskSearchTarget() {
  const urlParams = new URLSearchParams(window.location.search);

  return {
    type: urlParams.get("type"),
    id: Number(urlParams.get("id")),
    status: urlParams.get("status"),
    date: urlParams.get("date")
  };
}

function isTaskSearchTarget(taskId) {
  const target = getTaskSearchTarget();

  return target.type === "task" && target.id === Number(taskId);
}

function highlightTaskSearchTargetElement(element) {
  if (!element || hasHighlightedTaskSearchResult) {
    return;
  }

  hasHighlightedTaskSearchResult = true;

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

async function handleTaskUnauthorizedSession(data) {
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

        <div class="task-header-actions">
          <button type="button" class="task-voice-button">
            <i class="fa-solid fa-microphone"></i>
            Crear por voz
          </button>

          <button type="button" class="task-main-button">
            <i class="fa-solid fa-plus"></i>
            Nueva tarea
          </button>
        </div>
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
  const taskVoiceButton = document.querySelector(".task-voice-button");

  if (taskSaveButton) {
    taskSaveButton.addEventListener("click", saveTask);
  }

  if (taskMainButton) {
    taskMainButton.addEventListener("click", startNewTask);
  }

  if (taskVoiceButton) {
    taskVoiceButton.addEventListener("click", startVoiceTask);
  }

  if (getTaskSearchTarget().type === "task") {
    currentTaskFilter = "todas";
  }

  setupTaskFilters();
  loadTasks();
}

async function startVoiceTask() {
  const taskVoiceButton = document.querySelector(".task-voice-button");
  const taskTitle = document.getElementById("taskTitle");
  const taskCategory = document.getElementById("taskCategory");
  const taskPriority = document.getElementById("taskPriority");
  const taskDueDate = document.getElementById("taskDueDate");
  const taskDescription = document.getElementById("taskDescription");

  const isMobileApp =
    typeof window.isDanyBotRunningInMobileApp === "function" &&
    window.isDanyBotRunningInMobileApp();

  if (!isMobileApp || typeof window.startDanyBotNativeSpeech !== "function") {
    Swal.fire({
      title: "Voz no disponible",
      text: "No se encontró la configuración de voz nativa.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  try {
    if (taskVoiceButton) {
      taskVoiceButton.classList.add("listening");
      taskVoiceButton.innerHTML = `
        <i class="fa-solid fa-microphone-lines"></i>
        Escuchando...
      `;
    }

    const result = await window.startDanyBotNativeSpeech({
      language: "es-CO",
      prompt: "Di la tarea que quieres crear"
    });

    if (taskVoiceButton) {
      taskVoiceButton.classList.remove("listening");
      taskVoiceButton.innerHTML = `
        <i class="fa-solid fa-microphone"></i>
        Crear por voz
      `;
    }

    if (!result.success) {
      Swal.fire({
        title: "No se pudo escuchar",
        text: result.reason || "No se detectó ningún texto.",
        icon: "warning",
        confirmButtonColor: "#960018"
      });
      return;
    }

    const spokenText = result.text.toLowerCase();

    const detectedTask = detectTaskFromVoice(spokenText);

    taskTitle.value = detectedTask.title;
    taskCategory.value = detectedTask.category;
    taskPriority.value = detectedTask.priority;
    taskDueDate.value = detectedTask.due_date;
    taskDescription.value = spokenText;

    const taskForm = document.querySelector(".task-form");

    if (taskForm) {
      scrollToFullTaskForm();
    }

    function scrollToTasksList() {
      const tasksList = document.querySelector(".tasks-list");

      if (!tasksList) {
        return;
      }

      const listTop = tasksList.getBoundingClientRect().top + window.scrollY;

      window.scrollTo({
        top: listTop - 16,
        behavior: "smooth"
      });
    }

    const confirmation = await Swal.fire({
      title: "Tarea detectada",
      html: `
        <p><strong>Título:</strong> ${detectedTask.title}</p>
        <p><strong>Categoría:</strong> ${detectedTask.category}</p>
        <p><strong>Prioridad:</strong> ${detectedTask.priority}</p>
        <p><strong>Fecha límite:</strong> ${detectedTask.due_date}</p>
        <p style="margin-top: 10px;">¿Quieres guardar esta tarea?</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Guardar tarea",
      cancelButtonText: "Revisar primero",
      confirmButtonColor: "#960018",
      cancelButtonColor: "#6b7280"
    });

    if (confirmation.isConfirmed) {
      await saveTask();
    } else {
      setTimeout(() => {
        scrollToFullTaskForm();
      }, 300);
    }

  } catch (error) {
    console.error("Error en voz nativa de tareas:", error);

    if (taskVoiceButton) {
      taskVoiceButton.classList.remove("listening");
      taskVoiceButton.innerHTML = `
        <i class="fa-solid fa-microphone"></i>
        Crear por voz
      `;
    }

    Swal.fire({
      title: "Error de voz",
      text: "No fue posible usar el micrófono del celular.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function detectTaskFromVoice(text) {
  const cleanText = normalizeTaskVoiceText(text);

  const category = detectTaskCategoryFromVoice(cleanText);
  const priority = detectTaskPriorityFromVoice(cleanText);
  const dueDate = detectTaskDueDateFromVoice(cleanText);
  const title = detectTaskTitleFromVoice(cleanText);

  return {
    title,
    category,
    priority,
    due_date: dueDate
  };
}

function normalizeTaskVoiceText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectTaskCategoryFromVoice(text) {
  if (text.includes("trabajo") || text.includes("laboral")) {
    return "Trabajo";
  }

  if (text.includes("estudio") || text.includes("estudiar") || text.includes("universidad")) {
    return "Estudio";
  }

  if (text.includes("salud") || text.includes("medico") || text.includes("cita")) {
    return "Salud";
  }

  if (text.includes("finanzas") || text.includes("pago") || text.includes("banco") || text.includes("dinero")) {
    return "Finanzas";
  }

  if (text.includes("casa") || text.includes("hogar") || text.includes("aseo")) {
    return "Casa";
  }

  if (text.includes("compra") || text.includes("comprar") || text.includes("mercado")) {
    return "Compras";
  }

  if (text.includes("proyecto") || text.includes("danybot") || text.includes("app")) {
    return "Proyectos";
  }

  if (text.includes("tramite") || text.includes("documento")) {
    return "Trámites";
  }

  return "Personal";
}

function detectTaskPriorityFromVoice(text) {
  if (text.includes("prioridad alta") || text.includes("urgente") || text.includes("importante")) {
    return "Alta";
  }

  if (text.includes("prioridad baja") || text.includes("no urgente")) {
    return "Baja";
  }

  return "Media";
}

function detectTaskDueDateFromVoice(text) {
  const today = new Date();

  if (text.includes("pasado manana")) {
    const date = new Date(today);
    date.setDate(date.getDate() + 2);
    return formatTaskDateForInput(date);
  }

  if (text.includes("manana")) {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return formatTaskDateForInput(date);
  }

  if (text.includes("hoy")) {
    return formatTaskDateForInput(today);
  }

  const daysMatch = text.match(/en (\d+) dias?/);

  if (daysMatch) {
    const daysToAdd = Number(daysMatch[1]);
    const date = new Date(today);
    date.setDate(date.getDate() + daysToAdd);
    return formatTaskDateForInput(date);
  }

  if (
    text.includes("proxima semana") ||
    text.includes("la otra semana") ||
    text.includes("siguiente semana")
  ) {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    return formatTaskDateForInput(date);
  }

  const weekdays = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6
  };

  for (const dayName in weekdays) {
    if (text.includes(dayName)) {
      const targetDay = weekdays[dayName];
      const date = new Date(today);
      let daysToAdd = targetDay - today.getDay();

      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }

      date.setDate(date.getDate() + daysToAdd);
      return formatTaskDateForInput(date);
    }
  }

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
    octubre: 9,
    noviembre: 10,
    diciembre: 11
  };

  const dateMatch = text.match(/(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);

  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = months[dateMatch[2]];
    let year = today.getFullYear();

    let date = new Date(year, month, day);

    if (date < today) {
      date = new Date(year + 1, month, day);
    }

    return formatTaskDateForInput(date);
  }

  return formatTaskDateForInput(today);
}

function formatTaskDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function scrollToFullTaskForm() {
  const taskForm = document.querySelector(".task-form");

  if (!taskForm) {
    return;
  }

  const formTop = taskForm.getBoundingClientRect().top + window.scrollY;

  window.scrollTo({
    top: formTop - 12,
    behavior: "smooth"
  });
}

function detectTaskTitleFromVoice(text) {
  let title = text
    .replace(/\b(crea|crear|agrega|agregar|anota|registrar|registra)\b/g, "")
    .replace(/\b(una tarea|tarea|pendiente)\b/g, "")
    .replace(/\b(para hoy|para manana|para pasado manana|hoy|manana|pasado manana)\b/g, "")
    .replace(/\b(con prioridad alta|con prioridad media|con prioridad baja|prioridad alta|prioridad media|prioridad baja)\b/g, "")
    .replace(/\b(urgente|importante|no urgente)\b/g, "")
    .replace(/\b(de trabajo|de estudio|de salud|de finanzas|de casa|de compras|de proyectos|de tramites|personal)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    title = "Tarea creada por voz";
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function setupTaskFilters() {
  const filterButtons = document.querySelectorAll(".task-filter-button");

  filterButtons.forEach((button) => {
    if (button.dataset.filter === currentTaskFilter) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }

    button.addEventListener("click", () => {
      currentTaskFilter = button.dataset.filter;

      filterButtons.forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      renderTasksList();

      setTimeout(() => {
        scrollToTasksList();
      }, 120);
    });
  });
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
    if (a.status !== b.status) {
      return a.status === "pendiente" ? -1 : 1;
    }

    if (a.dueDate !== b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }

    return getPriorityValue(a.priority) - getPriorityValue(b.priority);
  });
}

function getTaskCompletedUntilDate(task) {
  if (!task.completedAt) {
    return null;
  }

  const completedDate = new Date(String(task.completedAt).replace(" ", "T"));
  completedDate.setDate(completedDate.getDate() + 10);

  return completedDate;
}

function shouldShowCompletedTask(task) {
  if (task.status !== "completada") {
    return true;
  }

  if (!task.completedAt) {
    return true;
  }

  const visibleUntilDate = getTaskCompletedUntilDate(task);

  if (!visibleUntilDate) {
    return true;
  }

  const now = new Date();

  return now <= visibleUntilDate;
}

function formatTaskCompletedUntil(task) {
  const visibleUntilDate = getTaskCompletedUntilDate(task);

  if (!visibleUntilDate) {
    return "";
  }

  return visibleUntilDate.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getFilteredTasks() {
  const today = getTodayDate();

  let filteredTasks = tasks.filter((task) => {
    return shouldShowCompletedTask(task);
  });

  if (currentTaskFilter === "pendiente") {
    filteredTasks = filteredTasks.filter((task) => {
      return task.status === "pendiente";
    });
  }

  if (currentTaskFilter === "completada") {
    filteredTasks = filteredTasks.filter((task) => {
      return task.status === "completada";
    });
  }

  if (currentTaskFilter === "hoy") {
    filteredTasks = filteredTasks.filter((task) => {
      return task.dueDate === today && task.status === "pendiente";
    });
  }

  return sortTasks(filteredTasks);
}

async function loadTasks() {
  const token = getTaskAuthToken();

  if (!token) {
    await handleTaskUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(TASKS_API_URL, {
      headers: getTaskAuthHeaders()
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleTaskUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudieron cargar",
        text: data.mensaje || "No se pudieron consultar las tareas.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    tasks = (data.tareas || []).map((task) => {
      return {
        id: task.id,
        user_id: task.user_id,
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        dueDate: task.due_date ? String(task.due_date).split("T")[0] : "",
        status: task.status,
        completedAt: task.completed_at || null
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
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim(),
    category: taskCategory.value,
    priority: taskPriority.value,
    due_date: taskDueDate.value,
    status: currentTask ? currentTask.status : "pendiente"
  };

  

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
      headers: getTaskAuthHeaders(true),
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleTaskUnauthorizedSession(data);
      return;
    }

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
    scrollToFullTaskForm();
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

    const isCompleted = task.status === "completada";
    const isOverdue = isTaskOverdue(task);
    const priority = task.priority || "Media";
    const category = task.category || "Sin categoría";
    const dueDate = task.dueDate || "Sin fecha";
    const description = task.description || "Sin descripción";
    const completedUntilLabel = isCompleted ? formatTaskCompletedUntil(task) : "";

    taskCard.classList.add("task-card");
    taskCard.dataset.taskId = task.id;

    if (isTaskSearchTarget(task.id)) {
      taskCard.classList.add("dashboard-search-target-card");
    }

    if (isCompleted) {
      taskCard.classList.add("task-completed");
    }

    if (isOverdue) {
      taskCard.classList.add("task-overdue");
    }

    taskCard.innerHTML = `
      <div class="task-card-main">
        <div>
          <h3>${task.title}</h3>
          <p>${description}</p>
        </div>

        <span class="task-priority priority-${priority.toLowerCase()}">
          ${priority}
        </span>
      </div>

      <div class="task-card-footer">
        <span>
          <i class="fa-solid fa-tag"></i>
          ${category}
        </span>

        <span>
          <i class="fa-solid fa-calendar-day"></i>
          ${dueDate}
        </span>

        <span class="task-status ${
          isOverdue 
            ? "status-vencida" 
            : `status-${task.status}`
        }">
          <i class="fa-solid ${
            isCompleted
              ? "fa-circle-check"
              : isOverdue
                ? "fa-triangle-exclamation"
                : "fa-clock"
          }"></i>
          ${
            isCompleted
              ? "Completada"
              : isOverdue
                ? "Vencida"
                : "Pendiente"
          }
        </span>
      </div>

      ${
        isCompleted
          ? `
            <div class="task-completed-note">
              <i class="fa-solid fa-circle-info"></i>
              ${
                completedUntilLabel
                  ? `Esta tarea completada se eliminará el ${completedUntilLabel}.`
                  : "Esta tarea completada se eliminará automáticamente después de 10 días."
              }
            </div>
          `
          : ""
      }

      <div class="task-card-actions">
        <button 
          type="button" 
          class="${isCompleted ? "task-reopen-button" : "task-complete-button"}"
          onclick="toggleTaskStatus(${task.id})"
        >
          <i class="fa-solid ${isCompleted ? "fa-rotate-left" : "fa-check"}"></i>
          ${isCompleted ? "Reabrir" : "Completar"}
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

    if (isTaskSearchTarget(task.id)) {
      highlightTaskSearchTargetElement(taskCard);
    }
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
      headers: getTaskAuthHeaders(true),
      body: JSON.stringify(updatedTask)
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleTaskUnauthorizedSession(data);
      return;
    }

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
    const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
      method: "DELETE",
      headers: getTaskAuthHeaders()
    });

    const data = await response.json();
    if (response.status === 401) {
      await handleTaskUnauthorizedSession(data);
      return;
    }

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