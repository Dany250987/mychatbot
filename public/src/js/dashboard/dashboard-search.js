// ===============================
// Buscador global del dashboard
// ===============================

const GLOBAL_SEARCH_API_URL = "/api/search";

function getGlobalSearchAuthHeaders() {
  const token = localStorage.getItem("authToken");

  return {
    Authorization: `Bearer ${token}`
  };
}

async function handleGlobalSearchUnauthorized(data) {
  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");

  const message = data?.error || data?.mensaje || "Tu sesión venció. Inicia sesión nuevamente.";

  await Swal.fire({
    title: "Sesión vencida",
    text: message,
    icon: "warning",
    confirmButtonColor: "#960018"
  });

  window.location.href = "login_google.html";
}

function getGlobalSearchTypeLabel(type) {
  const labels = {
    task: "Actividad antigua",
    reminder: "Actividad",
    expense: "Gasto",
    monthly_income: "Ingreso mensual",
    additional_income: "Ingreso adicional"
  };

  return labels[type] || "Resultado";
}

function getGlobalSearchTypeIcon(type) {
  const icons = {
    task: "fa-list-check",
    reminder: "fa-bell",
    expense: "fa-wallet",
    monthly_income: "fa-piggy-bank",
    additional_income: "fa-circle-plus"
  };

  return icons[type] || "fa-magnifying-glass";
}

function getGlobalSearchTypeClass(type) {
  const classes = {
    task: "search-task",
    reminder: "search-reminder",
    expense: "search-expense",
    monthly_income: "search-income",
    additional_income: "search-income"
  };

  return classes[type] || "search-default";
}

function formatGlobalSearchDate(value) {
  if (!value) {
    return "";
  }

  const cleanValue = String(value).split("T")[0];

  if (/^\d{4}-\d{2}$/.test(cleanValue)) {
    return cleanValue;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
    return cleanValue;
  }

  const [year, month, day] = cleanValue.split("-");

  return `${day}/${month}/${year}`;
}

function formatGlobalSearchTime(value) {
  if (!value) {
    return "";
  }

  return String(value).substring(0, 5);
}

function formatGlobalSearchMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof formatDashboardMoney === "function") {
    return formatDashboardMoney(value);
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  }).format(Number(value) || 0);
}

function getGlobalSearchResultMeta(result) {
  const meta = [];

  if (result.category) {
    meta.push(result.category);
  }

  if (result.date_value) {
    meta.push(formatGlobalSearchDate(result.date_value));
  }

  if (result.time_value) {
    meta.push(formatGlobalSearchTime(result.time_value));
  }

  if (result.status) {
    meta.push(result.status);
  }

  if (result.amount !== null && result.amount !== undefined) {
    meta.push(formatGlobalSearchMoney(result.amount));
  }

  return meta.join(" · ");
}

function getSearchResultMonth(result) {
  if (!result.date_value) {
    return "";
  }

  const cleanDate = String(result.date_value).split("T")[0];

  if (/^\d{4}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate.slice(0, 7);
  }

  return "";
}

function buildDashboardSearchUrl(result, section) {
  const params = new URLSearchParams();

  params.set("type", result.type);
  params.set("id", result.id);

  if (result.status) {
    params.set("status", result.status);
  }

  if (result.date_value) {
    params.set("date", String(result.date_value).split("T")[0]);
  }

  return `./dashboard.html?${params.toString()}#${section}`;
}

function goToGlobalSearchResult(result) {
  if (result.type === "task") {
    window.location.href = buildDashboardSearchUrl(result, "tareas");
    return;
  }

  if (result.type === "reminder") {
    window.location.href = buildDashboardSearchUrl(result, "recordatorios");
    return;
  }

  if (
    result.type === "expense" ||
    result.type === "monthly_income" ||
    result.type === "additional_income"
  ) {
    const params = new URLSearchParams();

    const resultMonth = getSearchResultMonth(result);

    if (resultMonth) {
      params.set("month", resultMonth);
    }

    params.set("type", result.type);
    params.set("id", result.id);

    window.location.href = `./gastos.html?${params.toString()}`;
  }
}

function renderGlobalSearchResults(data) {
  const resultsContainer = document.getElementById("globalSearchResults");

  if (!resultsContainer) {
    return;
  }

  const results = data.results || [];

  resultsContainer.style.display = "block";

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="global-search-empty">
        <i class="fa-solid fa-face-thinking"></i>
        <h3>No encontré resultados</h3>
        <p>Intenta buscar con otra palabra, categoría, fecha o valor.</p>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = `
    <div class="global-search-results-header">
      <h3>Resultados encontrados</h3>
      <span>${data.total} resultado${data.total === 1 ? "" : "s"}</span>
    </div>

    <div class="global-search-results-list">
      ${results.map((result) => `
        <button 
          type="button" 
          class="global-search-result-card ${getGlobalSearchTypeClass(result.type)}"
          data-result-type="${result.type}"
          data-result-id="${result.id}"
        >
          <div class="global-search-result-icon">
            <i class="fa-solid ${getGlobalSearchTypeIcon(result.type)}"></i>
          </div>

          <div class="global-search-result-info">
            <span>${getGlobalSearchTypeLabel(result.type)}</span>
            <strong>${result.title || "Sin título"}</strong>
            <p>${result.description || "Sin descripción"}</p>
            <small>${getGlobalSearchResultMeta(result)}</small>
          </div>
        </button>
      `).join("")}
    </div>
  `;

  const resultCards = resultsContainer.querySelectorAll(".global-search-result-card");

  resultCards.forEach((card) => {
    card.addEventListener("click", () => {
      const type = card.dataset.resultType;
      const id = Number(card.dataset.resultId);

      const selectedResult = results.find((item) => {
        return item.type === type && item.id === id;
      });

      if (selectedResult) {
        goToGlobalSearchResult(selectedResult);
      }
    });
  });
}

async function executeGlobalSearch() {
  const input = document.getElementById("globalSearchInput");
  const clearButton = document.getElementById("clearGlobalSearchButton");
  const resultsContainer = document.getElementById("globalSearchResults");

  if (!input) {
    return;
  }

  const query = input.value.trim();

  if (!query) {
    if (resultsContainer) {
      resultsContainer.style.display = "none";
      resultsContainer.innerHTML = "";
    }

    if (clearButton) {
      clearButton.style.display = "none";
    }

    return;
  }

  if (clearButton) {
    clearButton.style.display = "inline-flex";
  }

  try {
    const response = await fetch(`${GLOBAL_SEARCH_API_URL}?q=${encodeURIComponent(query)}`, {
      headers: getGlobalSearchAuthHeaders()
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleGlobalSearchUnauthorized(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo buscar",
        text: data.mensaje || "Ocurrió un error al realizar la búsqueda.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    renderGlobalSearchResults(data);

  } catch (error) {
    console.error("Error en buscador global:", error);

    Swal.fire({
      title: "Error",
      text: "No fue posible realizar la búsqueda global.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

function setupGlobalSearch() {
  const input = document.getElementById("globalSearchInput");
  const searchButton = document.getElementById("globalSearchButton");
  const clearButton = document.getElementById("clearGlobalSearchButton");
  const resultsContainer = document.getElementById("globalSearchResults");

  if (!input || !searchButton) {
    return;
  }

  let searchTimer = null;

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
      executeGlobalSearch();
    }, 500);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      executeGlobalSearch();
    }
  });

  searchButton.addEventListener("click", executeGlobalSearch);

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      input.value = "";
      clearButton.style.display = "none";

      if (resultsContainer) {
        resultsContainer.style.display = "none";
        resultsContainer.innerHTML = "";
      }

      input.focus();
    });
  }
}

document.addEventListener("DOMContentLoaded", setupGlobalSearch);