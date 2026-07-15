window.addEventListener("DOMContentLoaded", async () => {
  const userData = localStorage.getItem("userData");
  const authToken = localStorage.getItem("authToken");

  if (!userData || !authToken) {
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");

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

  let user = null;

  try {
    user = JSON.parse(userData);
  } catch (error) {
    console.error("Error al leer la sesión:", error);

    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");

    await Swal.fire({
      title: "Sesión inválida",
      text: "No se pudo leer tu sesión. Por favor, inicia sesión nuevamente.",
      icon: "warning",
      confirmButtonText: "Ir al login",
      confirmButtonColor: "#960018"
    });

    window.location.href = "login_google.html";
    return;
  }

  if (!user || !user.id) {
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");

    await Swal.fire({
      title: "Sesión inválida",
      text: "No se encontró la información del usuario. Por favor, inicia sesión nuevamente.",
      icon: "warning",
      confirmButtonText: "Ir al login",
      confirmButtonColor: "#960018"
    });

    window.location.href = "login_google.html";
    return;
  }

  currentUserId = user.id;

  const title = document.getElementById("section-title");
  const avatar = document.getElementById("user-avatar");
  const quickTaskButton = document.getElementById("quickTaskButton");
  const quickReminderButton = document.getElementById("quickReminderButton");

  if (title) {
    title.textContent = `Bienvenida, ${user.name || user.email || "Usuario"}`;
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
      window.location.hash = "recordatorios";
    });
  }

  if (quickReminderButton) {
    quickReminderButton.addEventListener("click", () => {
      window.location.hash = "recordatorios";
    });
  }

  setupSidebarHashNavigation();
  setupDashboardCardNavigation();

  /*
    Luego cargamos los datos.
    No usamos await aquí para no bloquear el sidebar.
  */
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

  const validSections = ["recordatorios", "calendario", "cuenta"];

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
      let user = null;

      try {
        user = userData ? JSON.parse(userData) : null;
      } catch (error) {
        user = null;
      }

      title.textContent = user
        ? `Bienvenida, ${user.name || user.email || "Usuario"}`
        : "Bienvenida 💫";
    }

    return;
  }

  showSection(activePage);
}


function toggleDashboardHomeCards(showCards) {
  const cardsOverview = document.querySelector(".cards-overview");
  const globalSearchPanel = document.getElementById("globalSearchPanel");

  if (cardsOverview) {
    cardsOverview.style.display = showCards ? "grid" : "none";
  }

  if (globalSearchPanel) {
    globalSearchPanel.style.display = showCards ? "block" : "none";
  }
}


function showSection(section, selectedLink = null) {
  const contentEl = document.getElementById("section-content");
  const title = document.getElementById("section-title");

  updateSidebar(section);
  toggleDashboardHomeCards(false);

  const sectionTitles = {
    motivacion: "Motivación",
    recordatorios: "Tus actividades",
    calendario: "Tu calendario",
    cuenta: "Mi cuenta",
    crecimiento: "Crecimiento personal",
    gastos: "Control de gastos",
    chistes: "Chistes del día"
  };

  const sectionIcons = {
    motivacion: "fa-lightbulb",
    recordatorios: "fa-bell",
    calendario: "fa-calendar-days",
    cuenta: "fa-user-gear",
    crecimiento: "fa-seedling",
    gastos: "fa-wallet",
    chistes: "fa-face-laugh-squint"
  };

  const selectedTitle = sectionTitles[section] || "Agenda Personal";
  const selectedIcon = sectionIcons[section] || "fa-house";

  if (title) {
    title.textContent = selectedTitle;
  }

  if (section === "recordatorios") {
    renderRemindersSection();
    return;
  }

  if (section === "calendario") {
    renderCalendarSection();
    return;
  }

  if (section === "cuenta") {
    renderAccountSection();
    return;
  }

  if (!contentEl) {
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

function setupSidebarHashNavigation() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest(".sidebar-link");

    if (!link) {
      return;
    }

    const href = link.getAttribute("href") || "";

    if (!href.includes("dashboard.html#")) {
      return;
    }

    const section = href.split("#")[1];

    const validSections = ["recordatorios", "calendario", "cuenta"];

    if (!validSections.includes(section)) {
      return;
    }

    event.preventDefault();

    if (window.location.hash === `#${section}`) {
      showSection(section);
      return;
    }

    window.location.hash = section;
  });
}


function setupDashboardCardNavigation() {
  const cardRoutes = [
    {
      counterId: "totalTasksCount",
      section: "recordatorios"
    },
    {
      counterId: "pendingTasksCount",
      section: "recordatorios"
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

function getCurrentSessionUser() {
  const userData = localStorage.getItem("userData");

  try {
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error al leer usuario:", error);
    return null;
  }
}

function getAccountAuthHeaders(includeJsonContent = false) {
  const token = localStorage.getItem("authToken");

  const headers = {
    Authorization: `Bearer ${token}`
  };

  if (includeJsonContent) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function renderAccountSection() {
  const contentEl = document.getElementById("section-content");

  if (!contentEl) {
    return;
  }

  const user = getCurrentSessionUser();

  if (!user) {
    contentEl.innerHTML = `
      <div class="section-placeholder">
        <div class="section-placeholder-icon">
          <i class="fa-solid fa-user-xmark"></i>
        </div>

        <div>
          <span class="welcome-badge">Sesión no encontrada</span>
          <h2>No se encontró información del usuario</h2>
          <p>Inicia sesión nuevamente para ver la información de tu cuenta.</p>
        </div>
      </div>
    `;
    return;
  }

  contentEl.innerHTML = `
    <div class="account-section">
      <div class="account-card">
        <div class="account-header">
          ${
            user.picture
              ? `<img src="${user.picture}" alt="${user.name || user.email}" class="account-avatar">`
              : `<div class="account-avatar-placeholder">
                  <i class="fa-solid fa-user"></i>
                </div>`
          }

          <div>
            <span class="welcome-badge">Información de cuenta</span>
            <h2>${user.name || "Usuario"}</h2>
            <p>${user.email || "Sin correo registrado"}</p>
          </div>
        </div>

        <div class="account-info-grid">
          <div>
            <span>Nombre</span>
            <strong>${user.name || "No registrado"}</strong>
          </div>

          <div>
            <span>Correo</span>
            <strong>${user.email || "No registrado"}</strong>
          </div>

          <div>
            <span>ID de usuario</span>
            <strong>${user.id || "No disponible"}</strong>
          </div>
        </div>
      </div>

      <div class="danger-zone-card">
        <div>
          <span class="welcome-badge danger-badge">Zona de peligro</span>
          <h2>Eliminar cuenta</h2>
          <p>
            Esta acción eliminará permanentemente tu cuenta y todos los datos asociados:
            actividades, avisos, gastos, ingresos y evidencias.
          </p>
        </div>

        <button type="button" class="delete-account-button" onclick="confirmDeleteAccount()">
          <i class="fa-solid fa-trash-can"></i>
          Eliminar cuenta
        </button>
      </div>
    </div>
  `;
}

async function confirmDeleteAccount() {
  const user = getCurrentSessionUser();

  if (!user) {
    await Swal.fire({
      title: "Sesión no encontrada",
      text: "No se pudo identificar el usuario actual.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const result = await Swal.fire({
    title: "Eliminar cuenta",
    html: `
      <div class="delete-account-modal">
        <p>
          Esta acción eliminará permanentemente tu cuenta y todos tus datos.
        </p>

        <p>
          Para confirmar, escribe:
          <strong>ELIMINAR</strong>
        </p>

        <input 
          id="deleteAccountConfirmation" 
          class="swal2-input" 
          placeholder="Escribe ELIMINAR"
        >

        <p style="margin-top: 12px;">
          Si tu cuenta fue creada con contraseña, ingrésala también.
          Si fue creada con Google, puedes dejar este campo vacío.
        </p>

        <input 
          id="deleteAccountPassword" 
          type="password" 
          class="swal2-input" 
          placeholder="Contraseña"
        >
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar definitivamente",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#960018",
    cancelButtonColor: "#6b7280",
    focusConfirm: false,
    preConfirm: () => {
      const confirmation = document.getElementById("deleteAccountConfirmation").value.trim();
      const password = document.getElementById("deleteAccountPassword").value;

      if (confirmation !== "ELIMINAR") {
        Swal.showValidationMessage("Debes escribir ELIMINAR para continuar.");
        return false;
      }

      return {
        confirmation,
        password
      };
    }
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch("/api/auth/account", {
      method: "DELETE",
      headers: getAccountAuthHeaders(true),
      body: JSON.stringify({
        confirmation: result.value.confirmation,
        password: result.value.password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      await Swal.fire({
        title: "No se pudo eliminar",
        text: data.mensaje || data.error || "Ocurrió un error al eliminar la cuenta.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    try {
      if (user && user.id) {
        localStorage.removeItem(`alertedReminderKeys_${user.id}`);
      }
    } catch (error) {
      console.error("Error al limpiar alertas:", error);
    }

    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");

    await Swal.fire({
      title: "Cuenta eliminada",
      text: data.mensaje || "Tu cuenta fue eliminada correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

    window.location.href = "login_google.html";

  } catch (error) {
    console.error("Error al eliminar cuenta:", error);

    await Swal.fire({
      title: "Error",
      text: "No fue posible eliminar la cuenta.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}