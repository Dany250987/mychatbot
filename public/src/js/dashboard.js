let tasks = [];

window.addEventListener("DOMContentLoaded", () => {
  const userData = localStorage.getItem("userData");

  if (!userData) {
    alert("⚠️ Sesión no iniciada. Por favor, inicia sesión.");
    window.location.href = "login_google_chatbot.html";
    return;
  }

  const user = JSON.parse(userData);

  const title = document.getElementById("section-title");
  const avatar = document.getElementById("user-avatar");
  const energiaCard = document.getElementById("card-energia");
  const quickTaskButton = document.getElementById("quickTaskButton");
  const quickReminderButton = document.getElementById("quickReminderButton");

  

  if (title) {
    title.textContent = `Bienvenida, ${user.name} 💫`;
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
            <option value="DanyBot">Proyecto DanyBot</option>
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

  console.log("Botón guardar tarea encontrado:", taskSaveButton);

  if (taskSaveButton) {
    taskSaveButton.addEventListener("click", saveTask);
  }

  renderTasksList();
  updateTasksSummary();
}

function saveTask() {
  console.log("Entró a saveTask");
  const taskTitle = document.getElementById("taskTitle");
  const taskCategory = document.getElementById("taskCategory");
  const taskPriority = document.getElementById("taskPriority");
  const taskDueDate = document.getElementById("taskDueDate");
  const taskDescription = document.getElementById("taskDescription");

  const newTask = {
    id: Date.now(),
    title: taskTitle.value.trim(),
    category: taskCategory.value,
    priority: taskPriority.value,
    dueDate: taskDueDate.value,
    description: taskDescription.value.trim(),
    status: "pendiente"
  };

  if (!newTask.title || !newTask.category || !newTask.dueDate) {
    alert("Completa el título, la categoría y la fecha límite.");
    return;
  }

  console.log("Nueva tarea creada:", newTask);

  tasks.push(newTask);

  console.log("Lista actual de tareas:", tasks);

  taskTitle.value = "";
  taskCategory.value = "";
  taskPriority.value = "Media";
  taskDueDate.value = "";
  taskDescription.value = "";

  renderTasksList();
  updateTasksSummary();
  updateDashboardTasksCount();
}

function renderTasksList() {
  const tasksList = document.querySelector(".tasks-list");

  if (!tasksList) {
    return;
  }

  if (tasks.length === 0) {
    tasksList.innerHTML = `
      <div class="empty-tasks">
        <i class="fa-solid fa-clipboard-list"></i>
        <h3>Aún no tienes tareas registradas</h3>
        <p>Cuando agregues una tarea, aparecerá en esta sección.</p>
      </div>
    `;
    return;
  }

  tasksList.innerHTML = "";

  tasks.forEach((task) => {
    const taskCard = document.createElement("div");

    taskCard.classList.add("task-card");

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

        <span>
          <i class="fa-solid fa-circle"></i>
          ${task.status}
        </span>
      </div>
    `;

    tasksList.appendChild(taskCard);
  });
}

function updateTasksSummary() {
  const summaryCards = document.querySelectorAll(".task-summary-card strong");

  if (summaryCards.length < 3) {
    return;
  }

  const pendingTasks = tasks.filter((task) => task.status === "pendiente").length;
  const completedTasks = tasks.filter((task) => task.status === "completada").length;

  const today = new Date().toISOString().split("T")[0];

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
  window.location.href = "login_google_chatbot.html";
}