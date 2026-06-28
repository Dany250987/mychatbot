function renderSidebar(activePage = "") {
  const sidebar = document.getElementById("appSidebar");

  if (!sidebar) {
    return;
  }

  sidebar.className = "app-sidebar";

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-brand-icon">
        <i class="fa-solid fa-robot"></i>
      </span>
      <span>DanyBot</span>
    </div>

    <nav class="sidebar-menu">
      <a href="./dashboard.html" class="sidebar-link ${activePage === "dashboard" ? "active" : ""}">
        <i class="fa-solid fa-house"></i>
        <span>Inicio</span>
      </a>

      <a href="./dashboard.html#tareas" class="sidebar-link ${activePage === "tareas" ? "active" : ""}">
        <i class="fa-solid fa-list-check"></i>
        <span>Tareas</span>
      </a>

      <a href="./dashboard.html#recordatorios" class="sidebar-link ${activePage === "recordatorios" ? "active" : ""}">
        <i class="fa-solid fa-bell"></i>
        <span>Recordatorios</span>
      </a>

      <a href="./dashboard.html#calendario" class="sidebar-link ${activePage === "calendario" ? "active" : ""}">
        <i class="fa-solid fa-calendar-days"></i>
        <span>Calendario</span>
      </a>

      <a href="./gastos.html" class="sidebar-link ${activePage === "gastos" ? "active" : ""}">
        <i class="fa-solid fa-wallet"></i>
        <span>Gastos</span>
      </a>
    </nav>

    <button type="button" class="sidebar-logout" onclick="logoutFromSidebar()">
      <i class="fa-solid fa-right-from-bracket"></i>
      <span>Cerrar sesión</span>
    </button>
  `;
}

function logoutFromSidebar() {
  localStorage.removeItem("userData");
  window.location.href = "login_google.html";
}