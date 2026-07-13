function renderSidebar(activePage = "") {
  const sidebar = document.getElementById("appSidebar");

  if (!sidebar) {
    return;
  }

  const userData = localStorage.getItem("userData");
  const user = userData ? JSON.parse(userData) : null;

  const userName = user?.name || user?.email || "Usuario";
  const userPicture = user?.picture || null;
  const userInitial = getUserInitials(userName);

  sidebar.className = "app-sidebar";

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      ${
        userPicture
          ? `
            <span class="sidebar-user-avatar">
              <img src="${userPicture}" alt="${userName}">
            </span>
          `
          : `
            <span class="sidebar-user-initial">
              ${userInitial}
            </span>
          `
      }

      <div class="sidebar-brand-text">
        <strong>Agenda Personal</strong>
        <small>Inteligente</small>
      </div>
    </div>

    <nav class="sidebar-menu">
      <a href="./dashboard.html" class="sidebar-link ${activePage === "dashboard" ? "active" : ""}">
        <i class="fa-solid fa-house"></i>
        <span>Inicio</span>
      </a>

      <a href="./dashboard.html#recordatorios" class="sidebar-link ${activePage === "recordatorios" ? "active" : ""}">
        <i class="fa-solid fa-bell"></i>
        <span>Actividades</span>
      </a>

      <a href="./dashboard.html#calendario" class="sidebar-link ${activePage === "calendario" ? "active" : ""}">
        <i class="fa-solid fa-calendar-days"></i>
        <span>Calendario</span>
      </a>

      <a href="./gastos.html" class="sidebar-link ${activePage === "gastos" ? "active" : ""}">
        <i class="fa-solid fa-wallet"></i>
        <span>Gastos</span>
      </a>

      <a href="./dashboard.html#cuenta" class="sidebar-link ${activePage === "cuenta" ? "active" : ""}">
        <i class="fa-solid fa-user-gear"></i>
        <span>Mi cuenta</span>
      </a>
    </nav>

    <button type="button" class="sidebar-logout" onclick="logoutFromSidebar()">
      <i class="fa-solid fa-right-from-bracket"></i>
      <span>Cerrar sesión</span>
    </button>
  `;
}

function getUserInitials(name) {
  if (!name) {
    return "U";
  }

  const cleanName = name.trim();

  if (!cleanName) {
    return "U";
  }

  const nameParts = cleanName.split(" ").filter((part) => part.length > 0);

  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }

  const firstInitial = nameParts[0].charAt(0).toUpperCase();
  const secondInitial = nameParts[1].charAt(0).toUpperCase();

  return `${firstInitial}${secondInitial}`;
}

function logoutFromSidebar() {
  const userData = localStorage.getItem("userData");

  try {
    const user = userData ? JSON.parse(userData) : null;

    if (user && user.id) {
      localStorage.removeItem(`alertedReminderKeys_${user.id}`);
    }
  } catch (error) {
    console.error("Error al limpiar datos de sesión:", error);
  }

  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");

  window.location.href = "login_google.html";
}