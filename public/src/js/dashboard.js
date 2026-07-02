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

  /*
    Primero pintamos el sidebar y el dashboard.
    Así evitamos que un error en gastos/ingresos deje la pantalla sin menú.
  */
  openSectionFromHash();

  window.addEventListener("hashchange", () => {
    openSectionFromHash();
  });

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

  /*
    Luego cargamos los datos.
    No usamos await aquí para no bloquear el sidebar.
  */
  loadDashboardTasksCount();
  loadDashboardRemindersCount();
  loadDashboardFinancialSummary();

  if (typeof loadAlertedReminderKeys === "function") {
    loadAlertedReminderKeys();
  }

  if (typeof startReminderAlertChecker === "function") {
    startReminderAlertChecker();
  }
  });


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






















































