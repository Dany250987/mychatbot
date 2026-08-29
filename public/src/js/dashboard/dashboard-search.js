// ===============================
// Buscador global del dashboard
// ===============================

function globalSearchT(key, fallback) {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.t === "function"
  ) {
    return window.DANYBOT_I18N.t(key) || fallback;
  }

  return fallback;
}

function getGlobalSearchLanguage() {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
  ) {
    return window.DANYBOT_I18N.getLanguage();
  }

  return "es";
}

function getGlobalSearchResponseText(
  data,
  key,
  fallback
) {
  if (getGlobalSearchLanguage() === "en") {
    return globalSearchT(key, fallback);
  }

  return (
    data?.mensaje ||
    data?.error ||
    data?.message ||
    globalSearchT(key, fallback)
  );
}

function normalizeGlobalSearchDisplayValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
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

  const message =
    getGlobalSearchLanguage() === "en"
      ? globalSearchT(
          "globalSearch.sessionExpiredText",
          "Your session has expired. Please sign in again."
        )
      : data?.error ||
        data?.mensaje ||
        globalSearchT(
          "globalSearch.sessionExpiredText",
          "Tu sesión venció. Inicia sesión nuevamente."
        );

  await Swal.fire({
    title: globalSearchT("globalSearch.sessionExpiredTitle", "Sesión vencida"),
    text: message,
    icon: "warning",
    confirmButtonColor: "#960018"
  });

  window.location.href = "login_google.html";
}

function getGlobalSearchTypeLabel(type) {
  const labels = {
    reminder: globalSearchT(
      "globalSearch.activity",
      "Actividad"
    ),
    expense: globalSearchT(
      "globalSearch.expense",
      "Gasto"
    ),
    monthly_income: globalSearchT(
      "globalSearch.monthlyIncome",
      "Ingreso mensual"
    ),
    additional_income: globalSearchT(
      "globalSearch.additionalIncome",
      "Ingreso adicional"
    ),
    document: globalSearchT(
      "globalSearch.document",
      "Documento"
    )
  };

  return (
    labels[type] ||
    globalSearchT(
      "globalSearch.result",
      "Resultado"
    )
  );
}

function getGlobalSearchValueLabel(value) {
  const normalized =
    normalizeGlobalSearchDisplayValue(value);

  const labels = {
    personal:
      globalSearchT(
        "globalSearch.personal",
        "Personal"
      ),
    finanzas:
      globalSearchT(
        "globalSearch.finances",
        "Finanzas"
      ),
    estudio:
      globalSearchT(
        "globalSearch.study",
        "Estudio"
      ),
    trabajo:
      globalSearchT(
        "globalSearch.work",
        "Trabajo"
      ),
    salud:
      globalSearchT(
        "globalSearch.health",
        "Salud"
      ),
    pagos:
      globalSearchT(
        "globalSearch.payments",
        "Pagos"
      ),
    otro:
      globalSearchT(
        "globalSearch.other",
        "Otro"
      ),
    factura:
      globalSearchT(
        "globalSearch.bill",
        "Factura"
      ),
    alimentacion:
      globalSearchT(
        "globalSearch.food",
        "Alimentación"
      ),
    transporte:
      globalSearchT(
        "globalSearch.transportation",
        "Transporte"
      ),
    entretenimiento:
      globalSearchT(
        "globalSearch.entertainment",
        "Entretenimiento"
      ),
    prestamos:
      globalSearchT(
        "globalSearch.loans",
        "Préstamos"
      ),
    "ingreso principal":
      globalSearchT(
        "globalSearch.mainIncome",
        "Ingreso principal"
      ),
    "ingreso adicional":
      globalSearchT(
        "globalSearch.additionalIncome",
        "Ingreso adicional"
      ),
    "documento personal":
      globalSearchT(
        "globalSearch.personalDocument",
        "Documento personal"
      ),
    activo:
      globalSearchT(
        "globalSearch.active",
        "Activo"
      ),
    completado:
      globalSearchT(
        "globalSearch.completed",
        "Completado"
      ),
    papelera:
      globalSearchT(
        "globalSearch.trash",
        "Papelera"
      )
  };

  return labels[normalized] || value || "";
}

function getGlobalSearchResultTitle(result) {
  const title = result?.title || "";

  if (
    result?.type === "monthly_income" &&
    normalizeGlobalSearchDisplayValue(title) ===
      "ingreso mensual"
  ) {
    return globalSearchT(
      "globalSearch.monthlyIncome",
      "Ingreso mensual"
    );
  }

  return (
    title ||
    globalSearchT(
      "globalSearch.noTitle",
      "Sin título"
    )
  );
}
function getGlobalSearchTypeIcon(type) {
  const icons = {
    reminder: "fa-bell",
    expense: "fa-wallet",
    monthly_income: "fa-piggy-bank",
    additional_income: "fa-circle-plus",
    document: "fa-file-lines"
  };

  return (
    icons[type] ||
    "fa-magnifying-glass"
  );
}

function getGlobalSearchTypeClass(type) {
  const classes = {
    reminder: "search-reminder",
    expense: "search-expense",
    monthly_income: "search-income",
    additional_income: "search-income",
    document: "search-document"
  };

  return (
    classes[type] ||
    "search-default"
  );
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

  return new Intl.DateTimeFormat(
    getGlobalSearchLanguage() === "en"
      ? "en-US"
      : "es-CO",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(
    new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    )
  );
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

  return new Intl.NumberFormat(getGlobalSearchLanguage() === "en" ? "en-US" : "es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  }).format(Number(value) || 0);
}

function getGlobalSearchResultMeta(result) {
  const meta = [];

  if (result.category) {
    meta.push(getGlobalSearchValueLabel(result.category));
  }

  if (result.date_value) {
    meta.push(formatGlobalSearchDate(result.date_value));
  }

  if (result.time_value) {
    meta.push(formatGlobalSearchTime(result.time_value));
  }

  if (result.status) {
    meta.push(getGlobalSearchValueLabel(result.status));
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
  /*
   * ACTIVIDADES
   */
  if (result.type === "reminder") {
    window.location.href =
      buildDashboardSearchUrl(
        result,
        "recordatorios"
      );

    return;
  }


  /*
   * DOCUMENTOS
   */
  if (result.type === "document") {
    const params =
      new URLSearchParams();

    params.set(
      "type",
      "document"
    );

    params.set(
      "id",
      result.id
    );

    window.location.href =
      `./documentos.html?${params.toString()}`;

    return;
  }


  /*
   * MOVIMIENTOS
   */
  if (
    result.type === "expense" ||
    result.type === "monthly_income" ||
    result.type === "additional_income"
  ) {
    const params =
      new URLSearchParams();

    const resultMonth =
      getSearchResultMonth(result);


    if (resultMonth) {
      params.set(
        "month",
        resultMonth
      );
    }


    params.set(
      "type",
      result.type
    );

    params.set(
      "id",
      result.id
    );


    window.location.href =
      `./gastos.html?${params.toString()}`;

    return;
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
        <h3>${globalSearchT("globalSearch.noResultsTitle", "No encontré resultados")}</h3>
        <p>${globalSearchT("globalSearch.noResultsText", "Intenta buscar con otra palabra, categoría, fecha o valor.")}</p>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = `
    <div class="global-search-results-header">
      <h3>${globalSearchT("globalSearch.resultsFound", "Resultados encontrados")}</h3>
      <span>${data.total} ${
        data.total === 1
          ? globalSearchT("globalSearch.resultSingular", "resultado")
          : globalSearchT("globalSearch.resultPlural", "resultados")
      }</span>
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
            <strong>${getGlobalSearchResultTitle(result)}</strong>
            <p>${result.description || globalSearchT("globalSearch.noDescription", "Sin descripción")}</p>
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
        title: globalSearchT("globalSearch.searchFailedTitle", "No se pudo buscar"),
        text: getGlobalSearchResponseText(data, "globalSearch.searchFailedText", "Ocurrió un error al realizar la búsqueda."),
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    renderGlobalSearchResults(data);

  } catch (error) {
    console.error("Error en buscador global:", error);

    Swal.fire({
      title: globalSearchT("globalSearch.errorTitle", "Error"),
      text: globalSearchT("globalSearch.globalSearchFailedText", "No fue posible realizar la búsqueda global."),
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