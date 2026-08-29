function dashboardUiT(key, fallback) {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.t === "function"
  ) {
    return window.DANYBOT_I18N.t(key);
  }

  return fallback;
}

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
    title.textContent = `${dashboardUiT("home.hello", "Hola")}, ${user.name || user.email || dashboardUiT("home.user", "Usuario")}`;
  }

  if (avatar) {
    const userName = user.name || user.email || "Usuario";

    const showAvatarPlaceholder = () => {
      const nameParts = userName
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      const initials =
        nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[1][0]}`
          : userName.charAt(0);

      const initialsSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
          <rect width="100%" height="100%" rx="50" fill="#cb4c46"/>
          <text
            x="50%"
            y="54%"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="#ffffff"
            font-family="Arial, sans-serif"
            font-size="36"
            font-weight="700"
          >
            ${initials.toUpperCase()}
          </text>
        </svg>
      `;

      avatar.onerror = null;
      avatar.src =
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(initialsSvg)}`;
      avatar.alt = `Iniciales de ${userName}`;
    };

    if (user.picture) {
      avatar.onerror = showAvatarPlaceholder;
      avatar.src = user.picture;
      avatar.alt = userName;
    } else {
      showAvatarPlaceholder();
    }

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
  showDanyBotInitialLoader();

  Promise.allSettled([
    loadDashboardRemindersCount(),
    loadDashboardFinancialSummary()
  ]).finally(() => {
    hideDanyBotInitialLoader();
  });

  if (typeof loadAlertedReminderKeys === "function") {
    loadAlertedReminderKeys();
  }

  if (typeof startReminderAlertChecker === "function") {
    startReminderAlertChecker();
  }
});

// =====================================================
// CARGADOR INICIAL DE DANYBOT MÓVIL
// =====================================================

let danyBotInitialLoaderTimeout = null;

function showDanyBotInitialLoader() {
  const isMobileApp =
    document.documentElement.classList.contains(
      "danybot-mobile-app"
    );

  if (!isMobileApp) {
    return;
  }

  if (document.getElementById("danyBotInitialLoader")) {
    return;
  }

  const loader = document.createElement("div");

  loader.id = "danyBotInitialLoader";
  loader.className = "danybot-initial-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");

  loader.innerHTML = `
    <div class="danybot-initial-loader-content">
      <div class="danybot-initial-loader-logo">
        <img
          src="./src/img/danybot.png"
          alt=""
          aria-hidden="true"
        >
      </div>

      <p>${
        window.DANYBOT_I18N?.t?.("common.preparingDay") ||
        "Preparando tu día..."
      }</p>

      <div
        class="danybot-initial-loader-dots"
        aria-hidden="true"
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  document.body.appendChild(loader);

  document.body.classList.add(
    "danybot-initial-loading"
  );

  /*
   * Protección: si alguna solicitud queda detenida,
   * el cargador no bloqueará indefinidamente la app.
   */
  danyBotInitialLoaderTimeout = window.setTimeout(() => {
    hideDanyBotInitialLoader();
  }, 12000);
}

function hideDanyBotInitialLoader() {
  const loader = document.getElementById(
    "danyBotInitialLoader"
  );

  if (danyBotInitialLoaderTimeout) {
    window.clearTimeout(danyBotInitialLoaderTimeout);
    danyBotInitialLoaderTimeout = null;
  }

  document.body.classList.remove(
    "danybot-initial-loading"
  );

  if (!loader) {
    return;
  }

  loader.classList.add("is-leaving");

  window.setTimeout(() => {
    loader.remove();
  }, 240);
}


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
        ? `${dashboardUiT("home.hello", "Hola")}, ${user.name || user.email || dashboardUiT("home.user", "Usuario")}`
        : `${dashboardUiT("home.hello", "Hola")} 👋`;
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
    recordatorios: dashboardUiT("activities.sectionTitle", "Tus actividades"),
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

  const accountT = (key, fallback) => {
    if (
      window.DANYBOT_I18N &&
      typeof window.DANYBOT_I18N.t === "function"
    ) {
      return window.DANYBOT_I18N.t(key);
    }

    return fallback;
  };

  const currentLanguage =
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
      ? window.DANYBOT_I18N.getLanguage()
      : "es";

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
            <span class="welcome-badge">${accountT("account.accountInfo", "Información de cuenta")}</span>
            <h2>${user.name || "Usuario"}</h2>
            <p>${user.email || accountT("account.noEmail", "Sin correo registrado")}</p>
          </div>
        </div>

        <div class="account-info-grid">
          <div>
            <span>${accountT("account.name", "Nombre")}</span>
            <strong>${user.name || accountT("account.notRegistered", "No registrado")}</strong>
          </div>

          <div>
            <span>${accountT("account.email", "Correo")}</span>
            <strong>${user.email || "No registrado"}</strong>
          </div>

          <div>
            <span>${accountT("account.userId", "ID de usuario")}</span>
            <strong>${user.id || "No disponible"}</strong>
          </div>
        </div>
      </div>

      <div class="account-logout-card account-language-card">
        <div>
          <span class="welcome-badge">
            ${accountT("account.language", "Idioma")}
          </span>

          <h2>
            ${accountT("account.language", "Idioma")}
          </h2>
        </div>

        <select
          id="accountLanguageSelect"
          class="account-language-select"
        >
          <option
            value="es"
            ${currentLanguage === "es" ? "selected" : ""}
          >
            ${accountT("account.spanish", "Español")}
          </option>

          <option
            value="en"
            ${currentLanguage === "en" ? "selected" : ""}
          >
            ${accountT("account.english", "English")}
          </option>
        </select>
      </div>

      <div class="account-logout-card">
        <div>
          <span class="welcome-badge">${accountT("account.session", "Sesión")}</span>
          <h2>${accountT("account.logout", "Cerrar sesión")}</h2>
          <p>
            ${accountT("account.logoutDescription", "Sal de tu cuenta actual para ingresar con otro usuario.")}
          </p>
        </div>

        <button
          type="button"
          class="account-logout-button"
          onclick="logoutFromSidebar()"
        >
          <i class="fa-solid fa-right-from-bracket"></i>
          ${accountT("account.logout", "Cerrar sesión")}
        </button>
      </div>

        <button type="button" class="delete-account-button" onclick="confirmDeleteAccount()">
          <i class="fa-solid fa-trash-can"></i>
          ${accountT("account.deleteAccount", "Eliminar cuenta")}
        </button>
      </div>
    </div>
  `;

  const accountLanguageSelect =
    contentEl.querySelector(
      "#accountLanguageSelect"
    );

  if (accountLanguageSelect) {
    accountLanguageSelect.addEventListener(
      "change",
      (event) => {
        if (
          window.DANYBOT_I18N &&
          typeof window.DANYBOT_I18N.setLanguage === "function"
        ) {
          window.DANYBOT_I18N.setLanguage(
            event.target.value
          );

          if (typeof renderSidebar === "function") {
            renderSidebar("cuenta");
          }

          renderAccountSection();
        }
      }
    );
  }

  const accountAvatar = contentEl.querySelector(".account-avatar");

  if (accountAvatar) {
    accountAvatar.addEventListener(
      "error",
      () => {
        const placeholder = document.createElement("div");
        placeholder.className = "account-avatar-placeholder";
        placeholder.innerHTML = '<i class="fa-solid fa-user"></i>';

        accountAvatar.replaceWith(placeholder);
      },
      { once: true }
    );
  }
}

async function confirmDeleteAccount() {
  const user = getCurrentSessionUser();

  const accountT = (key, fallback) => {
    if (
      window.DANYBOT_I18N &&
      typeof window.DANYBOT_I18N.t === "function"
    ) {
      return window.DANYBOT_I18N.t(key);
    }

    return fallback;
  };

  const currentLanguage =
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
      ? window.DANYBOT_I18N.getLanguage()
      : "es";

  if (!user) {
    await Swal.fire({
      title: accountT(
        "account.sessionNotFoundTitle",
        "Sesión no encontrada"
      ),
      text: accountT(
        "account.sessionNotFoundText",
        "No se pudo identificar el usuario actual."
      ),
      icon: "warning",
      confirmButtonColor: "#960018"
    });

    return;
  }

  const result = await Swal.fire({
    title: accountT(
      "account.deleteAccountTitle",
      "Eliminar cuenta"
    ),

    html: `
      <div class="delete-account-modal">
        <p>
          ${accountT(
            "account.deletePermanentWarning",
            "Esta acción eliminará permanentemente tu cuenta y todos tus datos."
          )}
        </p>

        <p>
          ${accountT(
            "account.deleteConfirmInstruction",
            "Para confirmar, escribe:"
          )}

          <strong>ELIMINAR</strong>
        </p>

        <input
          id="deleteAccountConfirmation"
          class="swal2-input"
          placeholder="${accountT(
            "account.deleteConfirmPlaceholder",
            "Escribe ELIMINAR"
          )}"
        >

        <p style="margin-top: 12px;">
          ${accountT(
            "account.deletePasswordHelp",
            "Si tu cuenta fue creada con contraseña, ingrésala también. Si fue creada con Google, puedes dejar este campo vacío."
          )}
        </p>

        <input
          id="deleteAccountPassword"
          type="password"
          class="swal2-input"
          placeholder="${accountT(
            "account.password",
            "Contraseña"
          )}"
        >
      </div>
    `,

    icon: "warning",
    showCancelButton: true,

    confirmButtonText: accountT(
      "account.deletePermanently",
      "Eliminar definitivamente"
    ),

    cancelButtonText: accountT(
      "account.cancel",
      "Cancelar"
    ),

    confirmButtonColor: "#960018",
    cancelButtonColor: "#6b7280",
    focusConfirm: false,

    preConfirm: () => {
      const confirmation =
        document
          .getElementById(
            "deleteAccountConfirmation"
          )
          .value
          .trim();

      const password =
        document
          .getElementById(
            "deleteAccountPassword"
          )
          .value;

      /*
       * IMPORTANTE:
       * El backend exige literalmente ELIMINAR.
       * No traducir esta palabra a DELETE.
       */
      if (confirmation !== "ELIMINAR") {
        Swal.showValidationMessage(
          accountT(
            "account.deleteValidation",
            "Debes escribir ELIMINAR para continuar."
          )
        );

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
    const response = await fetch(
      "/api/auth/account",
      {
        method: "DELETE",
        headers:
          getAccountAuthHeaders(true),

        body: JSON.stringify({
          confirmation:
            result.value.confirmation,

          password:
            result.value.password
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      await Swal.fire({
        title: accountT(
          "account.deleteFailedTitle",
          "No se pudo eliminar"
        ),

        text:
          currentLanguage === "es"
            ? (
                data.mensaje ||
                data.error ||
                accountT(
                  "account.deleteFailedText",
                  "Ocurrió un error al eliminar la cuenta."
                )
              )
            : accountT(
                "account.deleteFailedText",
                "Ocurrió un error al eliminar la cuenta."
              ),

        icon: "error",
        confirmButtonColor: "#960018"
      });

      return;
    }

    try {
      if (user && user.id) {
        localStorage.removeItem(
          `alertedReminderKeys_${user.id}`
        );
      }
    } catch (error) {
      console.error(
        "Error al limpiar alertas:",
        error
      );
    }

    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");

    await Swal.fire({
      title: accountT(
        "account.deletedTitle",
        "Cuenta eliminada"
      ),

      text:
        currentLanguage === "es"
          ? (
              data.mensaje ||
              accountT(
                "account.deletedText",
                "Tu cuenta fue eliminada correctamente."
              )
            )
          : accountT(
              "account.deletedText",
              "Tu cuenta fue eliminada correctamente."
            ),

      icon: "success",
      confirmButtonColor: "#960018"
    });

    window.location.href =
      "login_google.html";

  } catch (error) {
    console.error(
      "Error al eliminar cuenta:",
      error
    );

    await Swal.fire({
      title: "Error",

      text: accountT(
        "account.deleteErrorText",
        "No fue posible eliminar la cuenta."
      ),

      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function updateDanyBotAccountMobileView() {
  const isMobileApp =
    document.documentElement.classList.contains(
      "danybot-mobile-app"
    );

  if (!isMobileApp) {
    return;
  }

  const isAccountView =
    window.location.hash === "#cuenta";

  document.documentElement.classList.toggle(
    "danybot-account-view",
    isAccountView
  );
}

window.addEventListener(
  "hashchange",
  updateDanyBotAccountMobileView
);

document.addEventListener(
  "DOMContentLoaded",
  updateDanyBotAccountMobileView
);

updateDanyBotAccountMobileView();