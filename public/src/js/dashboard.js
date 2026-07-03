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
      window.location.hash = "tareas";
  });
  }

  if (quickReminderButton) {
    quickReminderButton.addEventListener("click", () => {
    window.location.hash = "recordatorios";
  });
  }

  setupDashboardCardNavigation();
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
    toggleDashboardHomeCards(true);
    updateSidebar("dashboard");

    const title = document.getElementById("section-title");

    if (title) {
      const userData = localStorage.getItem("userData");
      const user = userData ? JSON.parse(userData) : null;
      title.textContent = user ? `Bienvenida, ${user.name}` : "Bienvenida 💫";
    }

    return;
  }

  showSection(activePage);
}

function toggleDashboardHomeCards(showCards) {
  const cardsOverview = document.querySelector(".cards-overview");

  if (!cardsOverview) {
    return;
  }

  cardsOverview.style.display = showCards ? "grid" : "none";
}

function setupDashboardCardNavigation() {
  const cardRoutes = [
    {
      counterId: "totalTasksCount",
      section: "tareas"
    },
    {
      counterId: "pendingTasksCount",
      section: "tareas"
    },
    {
      counterId: "todayEventsCount",
      section: "calendario"
    },
    {
      counterId: "activeRemindersCount",
      section: "recordatorios"
    },
    {
      counterId: "monthlyExpensesAmount",
      url: "./gastos.html"
    },
    {
      counterId: "monthlyIncomeAmount",
      url: "./gastos.html"
    },
    {
      counterId: "monthlySavingsAmount",
      url: "./gastos.html"
    }
  ];

  cardRoutes.forEach((route) => {
    const counter = document.getElementById(route.counterId);

    if (!counter) {
      return;
    }

    const card = counter.closest(".dashboard-card");

    if (!card) {
      return;
    }

    card.classList.add("dashboard-card-clickable");

    card.addEventListener("click", () => {
      if (route.url) {
        window.location.href = route.url;
        return;
      }

      window.location.hash = route.section;
    });
  });
}

function toggleDashboardHomeCards(showCards) {
  const cardsOverview = document.querySelector(".cards-overview");

  if (!cardsOverview) {
    return;
  }

  cardsOverview.style.display = showCards ? "grid" : "none";
}

function showSection(section, selectedLink = null) {
  const contentEl = document.getElementById("section-content");
  const title = document.getElementById("section-title");

  updateSidebar(section);
  toggleDashboardHomeCards(false);

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

function setupDashboardCardNavigation() {
  const cardRoutes = [
    {
      counterId: "totalTasksCount",
      section: "tareas"
    },
    {
      counterId: "pendingTasksCount",
      section: "tareas"
    },
    {
      counterId: "todayEventsCount",
      section: "calendario"
    },
    {
      counterId: "activeRemindersCount",
      section: "recordatorios"
    },
    {
      counterId: "monthlyExpensesAmount",
      url: "./gastos.html"
    },
    {
      counterId: "monthlyIncomeAmount",
      url: "./gastos.html"
    },
    {
      counterId: "monthlySavingsAmount",
      url: "./gastos.html"
    }
  ];

  cardRoutes.forEach((route) => {
    const counter = document.getElementById(route.counterId);

    if (!counter) {
      return;
    }

    const card = counter.closest(".dashboard-card");

    if (!card) {
      return;
    }

    card.classList.add("dashboard-card-clickable");

    card.addEventListener("click", () => {
      if (route.url) {
        window.location.href = route.url;
        return;
      }

      if (window.location.hash === `#${route.section}`) {
        showSection(route.section);
        return;
      }

      window.location.hash = route.section;
    });
  });
}






















































