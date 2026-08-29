function movementT(key, fallback) {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.t === "function"
  ) {
    return window.DANYBOT_I18N.t(key);
  }

  return fallback;
}

function getMovementResponseText(data, key, fallback) {
  const language =
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
      ? window.DANYBOT_I18N.getLanguage()
      : "es";

  if (language === "en") {
    return movementT(key, fallback);
  }

  return (
    data?.mensaje ||
    data?.error ||
    movementT(key, fallback)
  );
}

function getMovementVoiceErrorText(reason, key, fallback) {
  const language =
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
      ? window.DANYBOT_I18N.getLanguage()
      : "es";

  if (language === "en") {
    return movementT(key, fallback);
  }

  return reason || movementT(key, fallback);
}

function getMovementsLocale() {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
  ) {
    return window.DANYBOT_I18N.getLanguage() === "en"
      ? "en-US"
      : "es-CO";
  }

  return "es-CO";
}

// ===============================
// Sesión de usuario
// ===============================

// Obtenemos los datos del usuario que inició sesión.
// Si no existe sesión válida o token, redirigimos al login.
const userData = localStorage.getItem("userData");
const authToken = localStorage.getItem("authToken");

let user = null;

try {
  user = userData ? JSON.parse(userData) : null;
} catch (error) {
  console.error("Error al leer la sesión:", error);
  user = null;
}

if (!user || !user.id || !authToken) {
  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");

  alert("⚠️ Sesión no iniciada o vencida. Por favor, inicia sesión nuevamente.");
  window.location.href = "login_google.html";
  throw new Error("Sesión no iniciada o token no encontrado");
}

// Por ahora conservamos USER_ID porque ingresos todavía no está protegido con token.
const USER_ID = user.id;

// Ruta base del backend para gastos.
const API_URL = '/api/expenses';

const INCOME_API_URL = '/api/incomes';

function getMovementCategoryDisplayLabel(category) {
  const value =
    String(category || "")
      .trim()
      .toLowerCase();

  const labels = {
    factura: movementT("movements.bill", "Factura"),
    alimentación: movementT("movements.food", "Alimentación"),
    alimentacion: movementT("movements.food", "Alimentación"),
    transporte: movementT("movements.transportation", "Transporte"),
    salud: movementT("movements.health", "Salud"),
    entretenimiento: movementT("movements.entertainment", "Entretenimiento"),
    prestamos: movementT("movements.loans", "Préstamos"),
    préstamos: movementT("movements.loans", "Préstamos"),
    otro: movementT("movements.other", "Otro"),
    ingreso: movementT("movements.incomeLabel", "Ingreso")
  };

  return labels[value] || category || "";
}

function getAuthHeaders(includeJsonContent = false) {
  const currentToken = localStorage.getItem("authToken");

  const headers = {
    Authorization: `Bearer ${currentToken}`
  };

  if (includeJsonContent) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function handleUnauthorizedSession(data) {
  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");

  const message = data?.error || data?.mensaje || 'Tu sesión venció o no es válida. Inicia sesión nuevamente.';

  if (typeof Swal !== 'undefined') {
    await Swal.fire({
      title: 'Sesión vencida',
      text: message,
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });
  } else {
    alert(message);
  }

  window.location.href = "login_google.html";
}

// Tomamos los elementos del HTML que vamos a usar.
const expenseForm = document.getElementById('expenseForm');
const expenseDate = document.getElementById('expenseDate');
const category = document.getElementById('category');
const description = document.getElementById('description');
const amount = document.getElementById('amount');
const expenseEvidence = document.getElementById('expenseEvidence');
const source = document.getElementById('source');
const expenseEvidenceName = document.getElementById('expenseEvidenceName');
const expenseId = document.getElementById('expenseId');
const submitExpenseButton = document.getElementById('submitExpenseButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const voiceButton = document.getElementById('voiceButton');
const incomeVoiceButton = document.getElementById('incomeVoiceButton');
const voiceText = document.getElementById('voiceText');
const downloadExcelButton = document.getElementById('downloadExcelButton');
const monthlyIncome = document.getElementById('monthlyIncome');
const monthlySavings = document.getElementById('monthlySavings');
const incomeAmount = document.getElementById('incomeAmount');
const incomeDescription = document.getElementById('incomeDescription');
const saveIncomeButton = document.getElementById('saveIncomeButton');

const additionalIncomeTotal = document.getElementById('additionalIncomeTotal');
const additionalIncomeDate = document.getElementById('additionalIncomeDate');
const additionalIncomeDescription = document.getElementById('additionalIncomeDescription');
const additionalIncomeAmount = document.getElementById('additionalIncomeAmount');
const saveAdditionalIncomeButton = document.getElementById('saveAdditionalIncomeButton');
const additionalIncomesList = document.getElementById('additionalIncomesList');


const expensesTableBody = document.getElementById('expensesTableBody');
const monthlyTotal = document.getElementById('monthlyTotal');
const expenseMessage = document.getElementById('expenseMessage');
const expenseCount = document.getElementById('expenseCount');
const highestExpense = document.getElementById('highestExpense');
const monthFilter = document.getElementById('monthFilter');
let currentExpenses = [];
let filteredExpenses = [];
let currentIncomeAmount = 0;
let currentExpensesTotal = 0;
let currentAdditionalIncomeTotal = 0;
let currentAdditionalIncomes = [];
let editingAdditionalIncomeId = null;
let currentMobileMovementFilter = 'all';

let categoryExpensesChart = null;
let financeSummaryChart = null;
let dailyExpensesChart = null;

let pendingIncomeCardToOpen = null;
let hasHighlightedSearchResult = false;


// Esta función consulta los gastos desde el backend.
async function loadExpenses() {
  try {
    const response = await fetch(API_URL, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }
    if (!response.ok) {
      expenseMessage.textContent = data.mensaje || 'Error al consultar los gastos';
      return;
    }

    currentExpenses = data.gastos || [];

    applyMonthFilter();
    renderActiveMobileMovementFilter();

  } catch (error) {
    console.error('Error al cargar gastos:', error);
    expenseMessage.textContent = 'No fue posible cargar los gastos';
  }
}


// Esta función guarda un gasto nuevo en la base de datos.
// La evidencia es opcional. Si se adjunta, se envía con FormData.
async function saveExpense(event) {
  event.preventDefault();

  const evidenceFile = expenseEvidence?.files?.[0] || null;

  const newExpense = {
    expense_date: expenseDate.value,
    category: category.value,
    description: description.value.trim(),
    amount: Number(amount.value),
    source: source.value || 'manual'
  };

  const editingId = expenseId.value;

  if (
    !newExpense.expense_date ||
    !newExpense.category ||
    !newExpense.description ||
    !newExpense.amount ||
    newExpense.amount <= 0
  ) {
    expenseMessage.textContent = 'Por favor completa todos los campos obligatorios.';
    return;
  }

  if (!validateExpenseEvidenceFile(evidenceFile)) {
    return;
  }

  const formData = new FormData();

  formData.append('expense_date', newExpense.expense_date);
  formData.append('category', newExpense.category);
  formData.append('description', newExpense.description);
  formData.append('amount', String(newExpense.amount));
  formData.append('source', newExpense.source);

  if (evidenceFile) {
    formData.append('evidence', evidenceFile);
  }

  try {
    const url = editingId ? `${API_URL}/${editingId}` : API_URL;
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: formData
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      expenseMessage.textContent = data.mensaje || 'No se pudo guardar el gasto.';
      return;
    }

    if (
      !editingId &&
      window.DANYBOT_ADS &&
      typeof window.DANYBOT_ADS.registerCreation === "function"
    ) {
      window.DANYBOT_ADS.registerCreation();
    }

    const editedExpenseId = editingId;

    const isMobileApp =
      document.documentElement.classList.contains(
        "danybot-mobile-app"
      ) ||
      document.body.classList.contains(
        "danybot-mobile-app"
      );

    /*
    * En Android, al editar:
    * - no muestra el Swal;
    * - cierra el modal;
    * - actualiza la lista;
    * - lleva al usuario a la card modificada.
    */
    if (editedExpenseId && isMobileApp) {
      expenseMessage.textContent = "";

      resetFormMode();

      document.dispatchEvent(
        new CustomEvent(
          "danybot:close-movement-modal"
        )
      );

      await loadExpenses();

      requestAnimationFrame(() => {
        focusExpenseCard(editedExpenseId);
      });

      return;
    }

    /*
 * En Android:
 * - al editar conserva el flujo existente;
 * - al crear no muestra Swal, cierra el modal y enfoca
 *   el gasto recién creado.
 */
  if (isMobileApp && !editedExpenseId) {

    const createdExpenseId = data.gastoId;

    expenseMessage.textContent = "";

    resetFormMode();

    document.dispatchEvent(
      new CustomEvent("danybot:close-movement-modal")
    );

    await loadExpenses();

    requestAnimationFrame(() => {
      if (createdExpenseId) {
        focusExpenseCard(createdExpenseId);
      }
    });

    return;
  }

  /*
  * Escritorio:
  * conserva exactamente el comportamiento actual.
  */
  await Swal.fire({
    title: editedExpenseId
      ? movementT("movements.expenseUpdatedTitle", "Gasto actualizado")
      : movementT("movements.expenseRegisteredTitle", "Gasto registrado"),

    text: editedExpenseId
      ? movementT("movements.expenseUpdatedText", "La información del gasto fue actualizada correctamente.")
      : movementT("movements.expenseRegisteredText", "El gasto fue guardado correctamente."),

    icon: "success",
    confirmButtonColor: "#3c0000"
  });

  expenseMessage.textContent = "";

  resetFormMode();

  await loadExpenses();

    } catch (error) {
      console.error('Error al guardar gasto:', error);
      expenseMessage.textContent = movementT("movements.genericErrorText", "Ocurrió un error.");
    }
  }


function validateExpenseEvidenceFile(file) {
  if (!file) {
    return true;
  }

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  const maxSizeBytes = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    Swal.fire({
      title: movementT("movements.fileNotAllowedTitle", "Archivo no permitido"),
      text: movementT("movements.fileNotAllowedText", "La evidencia debe ser PDF, JPG, PNG o WEBP."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return false;
  }

  if (file.size > maxSizeBytes) {
    Swal.fire({
      title: movementT("movements.fileTooLargeTitle", "Archivo muy pesado"),
      text: movementT("movements.fileTooLargeText", "La evidencia no puede superar los 5 MB."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return false;
  }

  return true;
}

function renderEvidenceCell(expense) {
  if (!expense.evidence_file_name) {
    return `
      <span class="no-evidence-label">
        ${movementT("movements.noEvidence", "Sin evidencia")}
      </span>
    `;
  }

  return `
    <button 
      type="button"
      class="evidence-view-button"
      onclick="openExpenseEvidence(${expense.id})"
    >
      <i class="bi bi-paperclip"></i>
      ${movementT("movements.view", "Ver")}
    </button>
  `;
}

function convertBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result || '';
      const base64 = String(result).split(',')[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function openExpensePdfWithNativeViewer(blob, expenseId) {
  try {
    const CapacitorPlugins = window.Capacitor?.Plugins || {};
    const Filesystem = CapacitorPlugins.Filesystem;
    const FileViewer = CapacitorPlugins.FileViewer;

    if (!Filesystem || !FileViewer) {
      Swal.fire({
        title: movementT("movements.viewerUnavailableTitle", "Visor no disponible"),
        text: movementT("movements.viewerUnavailableText", "No se encontró el visor nativo de archivos en la app."),
        icon: 'warning',
        confirmButtonColor: '#3c0000'
      });
      return;
    }

    const base64Data = await convertBlobToBase64(blob);
    const fileName = `evidencia-gasto-${expenseId}.pdf`;

    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: 'CACHE'
    });

    const fileInfo = await Filesystem.getUri({
      path: fileName,
      directory: 'CACHE'
    });

    await FileViewer.openDocumentFromLocalPath({
      path: fileInfo.uri
    });

  } catch (error) {
    console.error('Error al abrir PDF con visor nativo:', error);

    Swal.fire({
      title: movementT("movements.pdfOpenFailedTitle", "No se pudo abrir el PDF"),
      text: movementT("movements.pdfOpenFailedText", "El archivo se recibió, pero no se pudo abrir con el visor del celular."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

function refreshExpensesListHeight() {
  const content = document.getElementById("expensesListContent");

  if (!content) return;

  if (content.classList.contains("is-collapsed")) {
    content.style.maxHeight = "0px";
    return;
  }

  content.style.maxHeight = "none";
  content.style.height = "auto";
  content.style.overflow = "visible";
}


async function openExpenseEvidence(expenseId) {
  try {
    const response = await fetch(`${API_URL}/${expenseId}/evidence`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      const data = await response.json();
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      let message = movementT("movements.evidenceOpenErrorText", "Ocurrió un error al abrir la evidencia.");

      try {
        const data = await response.json();
        message = getMovementResponseText(data, "movements.evidenceOpenErrorText", message);
      } catch (error) {
        console.error('No se pudo leer el error de evidencia:', error);
      }

      Swal.fire({
        title: movementT("movements.evidenceUnavailableTitle", "Evidencia no disponible"),
        text: message,
        icon: 'warning',
        confirmButtonColor: '#3c0000'
      });

      return;
    }

    const blob = await response.blob();
    const fileUrl = URL.createObjectURL(blob);
    const contentType = (response.headers.get('content-type') || blob.type || '').toLowerCase();

    let evidencePreviewHtml = '';

    if (contentType.startsWith('image/')) {
      evidencePreviewHtml = `
        <img src="${fileUrl}" alt="${movementT("movements.expenseEvidenceTitle", "Evidencia del gasto")}" class="expense-evidence-image">
      `;
    } else if (contentType.includes('pdf')) {
      const isNativeApp =
        window.Capacitor &&
        typeof window.Capacitor.isNativePlatform === 'function' &&
        window.Capacitor.isNativePlatform();

      if (isNativeApp) {
        await openExpensePdfWithNativeViewer(blob, expenseId);
        URL.revokeObjectURL(fileUrl);
        return;
      }

      evidencePreviewHtml = `
        <iframe 
          src="${fileUrl}" 
          class="expense-evidence-pdf"
          
        ></iframe>
      `;
    } else {
      evidencePreviewHtml = `
        <div class="expense-evidence-file-message">
          <i class="bi bi-file-earmark-text"></i>
          <p>${movementT("movements.evidencePreviewUnavailable", "Este tipo de archivo no se puede previsualizar directamente en la app.")}</p>
          <a href="${fileUrl}" target="_blank" download="evidencia-gasto" class="expense-evidence-download">
            ${movementT("movements.openFile", "Abrir archivo")}
          </a>
        </div>
      `;
    }

    Swal.fire({
      title: movementT("movements.expenseEvidenceTitle", "Evidencia del gasto"),
      html: `
        <div class="expense-evidence-modal">
          ${evidencePreviewHtml}
        </div>
      `,
      confirmButtonText: movementT("movements.back", "Volver"),
      confirmButtonColor: '#960018',
      showCloseButton: true,
      width: 'min(92vw, 760px)',
      padding: 0,
      customClass: {
        popup: 'expense-evidence-popup',
        title: 'expense-evidence-title',
        htmlContainer: 'expense-evidence-html',
        closeButton: 'expense-evidence-close',
        confirmButton: 'expense-evidence-confirm'
      },
      didClose: () => {
        URL.revokeObjectURL(fileUrl);
      }
    });

  } catch (error) {
    console.error('Error al abrir evidencia:', error);

    Swal.fire({
      title: 'Error',
      text: movementT("movements.evidenceOpenErrorText", "Ocurrió un error al abrir la evidencia."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

function applyMonthFilter() {
  const selectedMonth = monthFilter.value;

  if (!selectedMonth) {
    filteredExpenses = currentExpenses;
    showExpenses(filteredExpenses);
    calculateMonthlyTotal(filteredExpenses);
    return;
  }

  filteredExpenses = currentExpenses.filter((expense) => {
    const expenseMonth = formatDateForInput(expense.expense_date).slice(0, 7);
    return expenseMonth === selectedMonth;
  });

  showExpenses(filteredExpenses);
  calculateMonthlyTotal(filteredExpenses);
}



function getExpenseSearchTarget() {
  const urlParams = new URLSearchParams(window.location.search);

  return {
    type: urlParams.get('type'),
    id: Number(urlParams.get('id')),
    month: urlParams.get('month')
  };
}

function isSearchTarget(type, id) {
  const target = getExpenseSearchTarget();

  return target.type === type && target.id === Number(id);
}

function highlightSearchTargetElement(element) {
  if (!element || hasHighlightedSearchResult) {
    return;
  }

  hasHighlightedSearchResult = true;

  setTimeout(() => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    element.classList.add('search-result-highlight');

    setTimeout(() => {
      element.classList.remove('search-result-highlight');
    }, 5000);
  }, 500);
}

function openIncomePanelForSearchTarget() {
  const target = getExpenseSearchTarget();

  if (target.type !== 'monthly_income' && target.type !== 'additional_income') {
    return;
  }

  const incomeContent = document.getElementById('incomeContent');

  if (incomeContent && incomeContent.classList.contains('is-collapsed')) {
    incomeContent.classList.remove('is-collapsed');
  }

  const incomeButton = document.querySelector('[data-collapse-target="incomeContent"]');

  if (incomeButton) {
    incomeButton.setAttribute('aria-expanded', 'true');

    const icon = incomeButton.querySelector('i');
    const text = incomeButton.querySelector('span');

    if (icon) {
      icon.className = 'bi bi-chevron-up';
    }

    if (text) {
      text.textContent = 'Ocultar';
    }
  }
}

function highlightMonthlyIncomeTarget() {
  const target = getExpenseSearchTarget();

  if (target.type !== 'monthly_income') {
    return;
  }

  const incomePanel = document.querySelector('.income-panel');

  highlightSearchTargetElement(incomePanel);
}

// Devuelve un icono visual según la categoría.
// Solo se usa para la presentación móvil.
function getExpenseIcon(category) {
  const icons = {
    Factura: 'bi-arrow-left-circle',
    Alimentación: 'bi-arrow-left-circle',
    Pasajes: 'bi-arrow-left-circle',
    Salud: 'bi-arrow-left-circle',
    Entretenimiento: 'bi-arrow-left-circle',
    Otro: 'bi-arrow-left-circle'
  };

  return icons[category] || 'bi-arrow-left-circle';
}

function createMobileExpenseRow(expense) {
  const row = document.createElement('tr');

  row.dataset.expenseId = expense.id;
  row.classList.add('mobile-expense-row');
  row.dataset.movementType = 'expense';

  if (isSearchTarget('expense', expense.id)) {
    row.classList.add('search-result-row');
  }

  const detailId = `expenseDetails-${expense.id}`;
  const categoryClass = getCategoryClass(
    expense.category
  );
  const expenseIcon = getExpenseIcon(
    expense.category
  );

  row.innerHTML = `
    <td colspan="7">
      <article
        class="mobile-expense-card"
        data-expense-id="${expense.id}"
      >

        <button
          type="button"
          class="mobile-expense-summary"
          aria-expanded="false"
          aria-controls="${detailId}"
        >
          <span class="mobile-expense-icon movement-expense-icon">
            <i class="bi ${expenseIcon}"></i>
          </span>

          <span class="mobile-expense-main">
            <strong class="mobile-expense-description">
              ${expense.description}
            </strong>

            <span class="mobile-expense-meta">
              <span class="mobile-expense-category">
                ${getMovementCategoryDisplayLabel(expense.category)}
              </span>

              <span class="mobile-expense-date">
                ${formatDate(expense.expense_date)}
              </span>
            </span>
          </span>

          <span class="mobile-expense-value">
            −${formatMoney(expense.amount)}
          </span>

          <i
            class="bi bi-chevron-down mobile-expense-chevron"
            aria-hidden="true"
          ></i>
        </button>

        <div
          id="${detailId}"
          class="mobile-expense-details"
          hidden
        >
          <div class="mobile-expense-detail-grid">

            <div class="mobile-expense-detail">
              <span>${movementT("movements.date", "Fecha")}</span>
              <strong>
                ${formatDate(expense.expense_date)}
              </strong>
            </div>

            <div class="mobile-expense-detail">
              <span>${movementT("movements.category", "Categoría")}</span>
              <strong>${getMovementCategoryDisplayLabel(expense.category)}</strong>
            </div>

            <div class="mobile-expense-detail">
              <span>${movementT("movements.source", "Origen")}</span>
              <strong>
                ${getSourceLabel(expense.source)}
              </strong>
            </div>

            <div class="mobile-expense-detail">
              <span>${movementT("movements.evidence", "Evidencia")}</span>

              <div class="mobile-expense-evidence">
                ${renderEvidenceCell(expense)}
              </div>
            </div>

          </div>

          <div class="mobile-expense-actions">
            <button
              type="button"
              class="mobile-expense-action edit"
              data-edit-expense="${expense.id}"
            >
              <i class="bi bi-pencil-square"></i>
              <span>${movementT("movements.edit", "Editar")}</span>
            </button>

            <button
              type="button"
              class="mobile-expense-action delete"
              data-delete-expense="${expense.id}"
            >
              <i class="bi bi-trash3"></i>
              <span>${movementT("movements.delete", "Eliminar")}</span>
            </button>
          </div>
        </div>

      </article>
    </td>
  `;

  const summaryButton = row.querySelector(
    '.mobile-expense-summary'
  );

  const details = row.querySelector(
    '.mobile-expense-details'
  );

  const chevron = row.querySelector(
    '.mobile-expense-chevron'
  );

  const card = row.querySelector(
    '.mobile-expense-card'
  );

  const editButton = row.querySelector(
    `[data-edit-expense="${expense.id}"]`
  );

  const deleteButton = row.querySelector(
    `[data-delete-expense="${expense.id}"]`
  );

  summaryButton.addEventListener('click', () => {
    const isExpanded =
      summaryButton.getAttribute(
        'aria-expanded'
      ) === 'true';

    summaryButton.setAttribute(
      'aria-expanded',
      String(!isExpanded)
    );

    details.hidden = isExpanded;

    chevron.className = isExpanded
      ? 'bi bi-chevron-down mobile-expense-chevron'
      : 'bi bi-chevron-up mobile-expense-chevron';

    card.classList.toggle(
      'is-expanded',
      !isExpanded
    );

    requestAnimationFrame(
      refreshExpensesListHeight
    );
  });

  editButton.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      startEditExpense(expense.id);
    }
  );

  deleteButton.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      deleteExpense(expense.id);
    }
  );

  if (isSearchTarget('expense', expense.id)) {
    highlightSearchTargetElement(row);
  }

  return row;
}

function showExpenses(expenses) {
  expensesTableBody.innerHTML = '';

  const isMobileApp =
    document.documentElement.classList.contains(
      'danybot-mobile-app'
    ) ||
    document.body.classList.contains(
      'danybot-mobile-app'
    );

  if (expenses.length === 0) {
    expensesTableBody.innerHTML = `
      <tr class="${isMobileApp ? 'mobile-expense-empty-row' : ''}">
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>

            <h3>No hay gastos para este mes</h3>

            <p>
              Cuando registres un gasto,
              aparecerá listado en esta sección.
            </p>
          </div>
        </td>
      </tr>
    `;

    refreshExpensesListHeight();
    return;
  }

  expenses.forEach((expense) => {
    /*
     * ANDROID
     * Reutiliza la tarjeta móvil extraída.
     */
    if (isMobileApp) {
      expensesTableBody.appendChild(
        createMobileExpenseRow(expense)
      );

      return;
    }

    /*
     * ESCRITORIO
     * Conserva la tabla original.
     */
    const row = document.createElement('tr');

    row.dataset.expenseId = expense.id;

    if (isSearchTarget('expense', expense.id)) {
      row.classList.add('search-result-row');
    }

    row.innerHTML = `
      <td>
        <span class="date-pill">
          <i class="bi bi-calendar-event"></i>
          ${formatDate(expense.expense_date)}
        </span>
      </td>

      <td>
        <span
          class="category-badge ${getCategoryClass(
            expense.category
          )}"
        >
          ${expense.category}
        </span>
      </td>

      <td>
        <strong class="expense-description">
          ${expense.description}
        </strong>
      </td>

      <td>
        <strong class="amount-cell">
          ${formatMoney(expense.amount)}
        </strong>
      </td>

      <td>
        ${renderEvidenceCell(expense)}
      </td>

      <td>
        <span
          class="source-badge ${getSourceClass(
            expense.source
          )}"
        >
          ${getSourceLabel(expense.source)}
        </span>
      </td>

      <td>
        <div class="action-buttons">
          <button
            type="button"
            class="action-btn edit-btn"
            onclick="startEditExpense(${expense.id})"
          >
            <i class="bi bi-pencil-square"></i>
            Editar
          </button>

          <button
            type="button"
            class="action-btn delete-btn"
            onclick="deleteExpense(${expense.id})"
          >
            <i class="bi bi-trash3"></i>
            Eliminar
          </button>
        </div>
      </td>
    `;

    expensesTableBody.appendChild(row);

    if (isSearchTarget('expense', expense.id)) {
      highlightSearchTargetElement(row);
    }
  });

  refreshExpensesListHeight();
}


// Esta función calcula el total de los gastos que se están mostrando.
function calculateMonthlyTotal(expenses) {
  let total = 0;
  let highest = 0;

  expenses.forEach((expense) => {
    const amountValue = Number(expense.amount);

    total += amountValue;

    if (amountValue > highest) {
      highest = amountValue;
    }
  });

  currentExpensesTotal = total;

  monthlyTotal.textContent = formatMoney(total);
  expenseCount.textContent = expenses.length;
  highestExpense.textContent = formatMoney(highest);

  updateSavings();
  updateExpenseCharts();
}

// Esta función asigna una clase de color según la categoría del gasto.
function getCategoryClass(category) {
  const categoryClasses = {
    Factura: 'badge-purple',
    Alimentación: 'badge-green',
    Transporte: 'badge-blue',
    Salud: 'badge-red',
    Entretenimiento: 'badge-pink',
    Otro: 'badge-gray'
  };

  return categoryClasses[category] || 'badge-gray';
}

// Esta función muestra el nombre del origen de forma más amigable.
function getSourceLabel(source) {
  const labels = {
    manual: movementT("movements.manual", "Manual"),
    voice: movementT("movements.voice", "Por voz")
  };

  return (
    labels[source] ||
    movementT("movements.manual", "Manual")
  );
}


// Esta función asigna una clase visual al origen del gasto.
function getSourceClass(source) {
  const sourceClasses = {
    manual: 'source-manual',
    voice: 'source-voice'
  };

  return sourceClasses[source] || 'source-manual';
}

// Esta función da formato de moneda colombiana.
function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
}



// Esta función muestra la fecha sin que el navegador la cambie por zona horaria.
function formatDate(dateValue) {
  const cleanDate = formatDateForInput(dateValue);

  if (!cleanDate) {
    return "";
  }

  const [year, month, day] =
    cleanDate.split("-");

  if (!year || !month || !day) {
    return cleanDate;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return new Intl.DateTimeFormat(
    getMovementsLocale(),
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);
}

// Esta función convierte la fecha al formato que necesita el input type="date".
function formatDateForInput(dateValue) {
  if (!dateValue) {
    return '';
  }

  return String(dateValue).split('T')[0].split(' ')[0];
}

// Esta función obtiene la fecha local del sistema en formato YYYY-MM-DD.
// No usa toISOString porque toISOString convierte la fecha a UTC.
function getLocalDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


// Esta función coloca por defecto la fecha local de hoy en el formulario.
function setTodayDate() {
  expenseDate.value = getLocalDate();
}

// Esta función obtiene el mes local del sistema en formato YYYY-MM.
function getLocalMonth() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}


// Esta función coloca por defecto el mes actual local en el filtro.
function setCurrentMonthFilter() {
  const urlParams = new URLSearchParams(window.location.search);
  const monthFromUrl = urlParams.get('month');

  if (monthFromUrl && /^\d{4}-\d{2}$/.test(monthFromUrl)) {
    monthFilter.value = monthFromUrl;
    return;
  }

  monthFilter.value = getLocalMonth();
}

function focusExpenseCard(expenseId) {
  const card = document.querySelector(
    `.mobile-expense-card[data-expense-id="${expenseId}"]`
  );

  if (!card) {
    return;
  }

  const summaryButton = card.querySelector(
    ".mobile-expense-summary"
  );

  const details = card.querySelector(
    ".mobile-expense-details"
  );

  const chevron = card.querySelector(
    ".mobile-expense-chevron"
  );

  if (summaryButton && details) {
    summaryButton.setAttribute(
      "aria-expanded",
      "true"
    );

    details.hidden = false;
    card.classList.add("is-expanded");

    if (chevron) {
      chevron.className =
        "bi bi-chevron-up mobile-expense-chevron";
    }
  }

    requestAnimationFrame(() => {
      card.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      if (typeof refreshExpensesListHeight === "function") {
        refreshExpensesListHeight();
      }

      card.classList.remove("focus-highlight");

      requestAnimationFrame(() => {
        card.classList.add("focus-highlight");

        setTimeout(() => {
          card.classList.remove("focus-highlight");
        }, 900);
      });
    });
}

// Esta función carga un gasto en el formulario para poder editarlo.
function startEditExpense(id) {
  const expense = currentExpenses.find((item) => item.id === id);

  if (!expense) {
    expenseMessage.textContent = movementT("movements.expenseNotFoundEdit", "No se encontró el gasto para editar.");
    return;
  }

  expenseId.value = expense.id;
  expenseDate.value = formatDateForInput(expense.expense_date);
  category.value = expense.category;
  description.value = expense.description;
  amount.value = Number(expense.amount);
  source.value = expense.source || 'manual';

  if (expenseEvidence) {
    expenseEvidence.value = '';
  }

  submitExpenseButton.innerHTML = `<i class="bi bi-check2-circle"></i> ${movementT("movements.updateExpense", "Actualizar gasto")}`;
  cancelEditButton.style.display = 'block';

  expenseMessage.textContent = '';

  const isMobileApp =
    document.documentElement.classList.contains(
      "danybot-mobile-app"
    ) ||
    document.body.classList.contains(
      "danybot-mobile-app"
    );

  if (isMobileApp) {
    document.dispatchEvent(
      new CustomEvent(
        "danybot:open-expense-edit-modal"
      )
    );
  } else {
    const expenseForm =
      document.getElementById("expenseForm") ||
      document.querySelector(".expense-form");

    if (expenseForm) {
      expenseForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  setTimeout(() => {
    if (description) {
      description.focus();
    }
  }, 450);
}

// Esta función elimina un gasto desde la pantalla.
async function deleteExpense(expenseId) {

  try {
    const response = await fetch(`${API_URL}/${expenseId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true)
    });

    const data = await response.json();
    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: movementT("movements.deleteFailedTitle", "No se pudo eliminar"),
        text: getMovementResponseText(data, "movements.genericErrorText", "Ocurrió un error."),
        icon: 'error',
      confirmButtonColor: '#3c0000'
      });
      return;
    }

    await Swal.fire({
      title: movementT("movements.expenseDeletedTitle", "Gasto eliminado"),
      text: movementT("movements.expenseDeletedText", "El gasto fue eliminado correctamente."),
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

    loadExpenses();

  } catch (error) {
    console.error('Error al eliminar gasto:', error);

    Swal.fire({
      title: 'Error',
      text: movementT("movements.expenseDeleteErrorText", "Ocurrió un error al eliminar el gasto."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

// Esta función limpia el formulario y vuelve al modo crear.
function resetFormMode() {
  expenseForm.reset();

  expenseId.value = '';
  source.value = 'manual';

  if (expenseEvidence) {
    expenseEvidence.value = '';
  }

  submitExpenseButton.innerHTML = `<i class="bi bi-save2"></i> ${movementT("movements.saveExpense", "Guardar gasto")}`;
  cancelEditButton.style.display = 'none';

  setTodayDate();
  setupMobileExpenseDate();
}

async function startVoiceExpense() {
  const isMobileApp =
    typeof window.isDanyBotRunningInMobileApp === "function" &&
    window.isDanyBotRunningInMobileApp();

  if (isMobileApp) {
    if (typeof window.startDanyBotNativeSpeech !== "function") {
      Swal.fire({
        title: movementT("movements.voiceUnavailableTitle", "Voz no disponible"),
        text: movementT("movements.nativeVoiceUnavailableText", "No se encontró la configuración de voz nativa."),
        icon: "warning",
        confirmButtonColor: "#3c0000"
      });
      return;
    }

    try {
      voiceButton.classList.add("listening");
      voiceButton.innerHTML = `<i class="bi bi-mic-fill"></i> ${movementT("movements.listening", "Escuchando...")}`;

      const result = await window.startDanyBotNativeSpeech({
        language: getMovementsLocale(),
        prompt: movementT("movements.expenseVoicePrompt", "Di el gasto que quieres registrar")
      });

      voiceButton.classList.remove("listening");
      voiceButton.innerHTML = `<i class="bi bi-mic-fill"></i> ${movementT("movements.dictateExpenseVoice", "Dictar gasto por voz")}`;

      if (!result.success) {
        Swal.fire({
          title: movementT("movements.couldNotListenTitle", "No se pudo escuchar"),
          text: result.reason || "No se detectó ningún texto.",
          icon: "warning",
          confirmButtonColor: "#3c0000"
        });
        return;
      }

      const transcript = result.text.toLowerCase();

      console.log('INGRESO VOZ - texto:', transcript);

      await fillExpenseFromVoice(transcript);

      return;

    } catch (error) {
      console.error("Error en voz nativa de gastos:", error);

      voiceButton.classList.remove("listening");
      voiceButton.innerHTML = `<i class="bi bi-mic-fill"></i> ${movementT("movements.dictateExpenseVoice", "Dictar gasto por voz")}`;

      Swal.fire({
        title: movementT("movements.voiceErrorTitle", "Error de voz"),
        text: movementT("movements.voiceMicrophoneErrorText", "No fue posible usar el micrófono del celular."),
        icon: "error",
        confirmButtonColor: "#3c0000"
      });

      return;
    }
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    Swal.fire({
      title: movementT("movements.speechUnavailableTitle", "Reconocimiento de voz no disponible"),
      text: movementT("movements.speechUnavailableText", "Tu navegador no permite usar dictado por voz en esta página. Prueba con Chrome."),
      icon: "warning",
      confirmButtonColor: "#3c0000"
    });
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = getMovementsLocale();
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceButton.classList.add("listening");
  voiceButton.innerHTML = `<i class="bi bi-mic-fill"></i> ${movementT("movements.listening", "Escuchando...")}`;

  let voiceTimeout = setTimeout(() => {
    try {
      recognition.stop();
    } catch (error) {
      console.warn("No se pudo detener el reconocimiento:", error);
    }

    voiceButton.classList.remove("listening");
    voiceButton.innerHTML = `<i class="bi bi-mic-fill"></i> ${movementT("movements.dictateExpenseVoice", "Dictar gasto por voz")}`;

    Swal.fire({
      title: movementT("movements.noVoiceTitle", "No se detectó voz"),
      text: movementT("movements.noVoiceText", "No logré escuchar ningún texto. Intenta nuevamente."),
      icon: "warning",
      confirmButtonColor: "#3c0000"
    });
  }, 10000);

  recognition.start();

  recognition.onresult = async (event) => {
    clearTimeout(voiceTimeout);

    const transcript = event.results[0][0].transcript.toLowerCase();

    await fillExpenseFromVoice(transcript);
  };

  recognition.onerror = () => {
    clearTimeout(voiceTimeout);

    voiceButton.classList.remove("listening");
    voiceButton.innerHTML = `<i class="bi bi-mic-fill"></i> ${movementT("movements.dictateExpenseVoice", "Dictar gasto por voz")}`;

    Swal.fire({
      title: movementT("movements.couldNotListenTitle", "No se pudo escuchar"),
      text: movementT("movements.microphoneCheckText", "Revisa el permiso del micrófono o intenta hablar más cerca del dispositivo."),
      icon: "error",
      confirmButtonColor: "#3c0000"
    });
  };

  recognition.onend = () => {
    clearTimeout(voiceTimeout);

    voiceButton.classList.remove("listening");
    voiceButton.innerHTML = `<i class="bi bi-mic-fill"></i> ${movementT("movements.dictateExpenseVoice", "Dictar gasto por voz")}`;
  };
}

async function fillExpenseFromVoice(text) {
  const detectedAmount = extractAmount(text);
  const detectedCategory = extractCategory(text);
  const detectedDescription = extractDescription(text);
  const detectedDate = extractDate(text);

  const detectedExpense = {
    expense_date: detectedDate || getLocalDate(),
    category: detectedCategory || 'Otro',
    description: detectedDescription || movementT("movements.voiceExpenseDefaultDescription", "Gasto registrado por voz"),
    amount: Number(detectedAmount),
    source: 'voice'
  };

  expenseDate.value = detectedExpense.expense_date;
  category.value = detectedExpense.category;
  description.value = detectedExpense.description;
  amount.value = detectedExpense.amount || '';
  source.value = 'voice';

  if (expenseId.value) {
    Swal.fire({
      title: movementT("movements.editingExpenseTitle", "Estás editando un gasto"),
      text: movementT("movements.editingExpenseText", "Termina o cancela la edición antes de guardar un gasto por voz automáticamente."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  if (!detectedExpense.amount || detectedExpense.amount <= 0) {
    Swal.fire({
      title: movementT("movements.amountNotDetectedTitle", "No detecté el valor"),
      text: movementT("movements.expenseAmountNotDetectedText", "No pude identificar el monto del gasto. Revisa el formulario y guárdalo manualmente."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  await saveVoiceExpenseAuto(detectedExpense);
}

async function saveVoiceExpenseAuto(expenseData) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(expenseData)
    });

    const data = await response.json();
    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: movementT("movements.saveFailedTitle", "No se pudo guardar"),
        text: getMovementResponseText(data, "movements.voiceExpenseSaveFailedText", "No se pudo guardar el gasto por voz."),
        icon: 'error',
      confirmButtonColor: '#3c0000'
      });

      return;
    }

    if (
      window.DANYBOT_ADS &&
      typeof window.DANYBOT_ADS.registerCreation === 'function'
    ) {
      window.DANYBOT_ADS.registerCreation();
      console.log('AdMob: gasto por voz registrado');
    }

    const expenseMonth = expenseData.expense_date.slice(0, 7);

    if (monthFilter.value !== expenseMonth) {
      monthFilter.value = expenseMonth;
      await loadMonthlyIncome();
      await loadAdditionalIncomes();
    }

    if (isDanyBotMobileApp()) {
      const createdExpenseId = data.gastoId;

      resetFormMode();

      document.dispatchEvent(
        new CustomEvent(
          'danybot:close-movement-modal'
        )
      );

      currentMobileMovementFilter = 'expense';

      document
        .querySelectorAll('.mobile-movement-filter')
        .forEach((button) => {
          button.classList.toggle(
            'is-active',
            button.dataset.movementFilter === 'expense'
          );
        });

      await loadExpenses();

      requestAnimationFrame(() => {
        if (createdExpenseId) {
          focusExpenseCard(createdExpenseId);
        }
      });

      return;
    }

    await loadExpenses();

    resetFormMode();

    Swal.fire({
      title: movementT("movements.expenseAutoSavedTitle", "Gasto guardado automáticamente"),
      text: `${expenseData.description} · ${formatMoney(expenseData.amount)} · ${movementT("movements.expenseAutoSavedSuffix", "fue registrado correctamente.")}`,
      icon: 'success',
      timer: 2600,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });

  } catch (error) {
    console.error('Error al guardar gasto por voz:', error);

    Swal.fire({
      title: 'Error',
      text: movementT("movements.voiceExpenseSaveErrorText", "Ocurrió un error al guardar el gasto por voz."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

function extractEnglishSpokenAmount(text) {
  const normalizedText =
    normalizeMoneyText(text)
      .replace(/-/g, " ");

  // Casos como:
  // "50 thousand"
  // "2.5 million"
  const directScaleMatch =
    normalizedText.match(
      /\b(\d+(?:\.\d+)?)\s*(thousand|million)\b/
    );

  if (directScaleMatch) {
    const value = Number(directScaleMatch[1]);

    const multiplier =
      directScaleMatch[2] === "million"
        ? 1000000
        : 1000;

    return Math.round(value * multiplier);
  }

  const numberValues = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90
  };

  const tokens =
    normalizedText
      .split(/\s+/)
      .filter(Boolean);

  let current = 0;
  let total = 0;
  let bestAmount = 0;
  let hasNumber = false;

  const commitAmount = () => {
    if (!hasNumber) {
      return;
    }

    const amount = total + current;

    if (amount > bestAmount) {
      bestAmount = amount;
    }

    current = 0;
    total = 0;
    hasNumber = false;
  };

  tokens.forEach((token) => {
    if (/^\d+$/.test(token)) {
      current += Number(token);
      hasNumber = true;
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        numberValues,
        token
      )
    ) {
      current += numberValues[token];
      hasNumber = true;
      return;
    }

    if (token === "hundred") {
      current =
        Math.max(current, 1) * 100;

      hasNumber = true;
      return;
    }

    if (token === "thousand") {
      total +=
        Math.max(current, 1) * 1000;

      current = 0;
      hasNumber = true;
      return;
    }

    if (token === "million") {
      total +=
        Math.max(current, 1) * 1000000;

      current = 0;
      hasNumber = true;
      return;
    }

    if (token === "and" && hasNumber) {
      return;
    }

    commitAmount();
  });

  commitAmount();

  return bestAmount || "";
}


function extractEnglishExpenseCategory(text) {
  const normalizedText =
    normalizeMoneyText(text);

  const hasAny = (keywords) =>
    keywords.some(
      (keyword) =>
        normalizedText.includes(keyword)
    );

  if (
    hasAny([
      "bill",
      "utility",
      "utilities",
      "service",
      "receipt",
      "electricity",
      "water",
      "internet",
      "phone bill",
      "gas bill",
      "utility bill",
      "internet bill"
    ])
  ) {
    return "Factura";
  }

  if (
    hasAny([
      "food",
      "lunch",
      "breakfast",
      "dinner",
      "groceries",
      "grocery",
      "supermarket",
      "restaurant"
    ])
  ) {
    return "Alimentación";
  }

  if (
    hasAny([
      "transport",
      "transportation",
      "taxi",
      "uber",
      "bus",
      "fare",
      "ticket"
    ])
  ) {
    return "Transporte";
  }

  if (
    hasAny([
      "health",
      "medicine",
      "medication",
      "doctor",
      "medical",
      "pharmacy",
      "appointment"
    ])
  ) {
    return "Salud";
  }

  if (
    hasAny([
      "movie",
      "movies",
      "cinema",
      "entertainment",
      "outing"
    ])
  ) {
    return "Entretenimiento";
  }

  if (
    hasAny([
      "loan",
      "loans"
    ])
  ) {
    return "Prestamos";
  }

  return "Otro";
}


function cleanEnglishMovementDescription(
  text,
  type
) {
  let descriptionText =
    normalizeMoneyText(text);

  if (type === "expense") {
    descriptionText =
      descriptionText
        .replace(
          /\b(add|register|record|save|note)\b/g,
          ""
        )
        .replace(
          /\b(spent|spend|paid|pay|bought|buy|purchased|purchase)\b/g,
          ""
        )
        .replace(
          /\b(an expense|expense)\b/g,
          ""
        );
  } else {
    descriptionText =
      descriptionText
        .replace(
          /\b(add|register|record|save|note)\b/g,
          ""
        )
        .replace(
          /\b(received|receive|earned|earn|got|get|collected|collect)\b/g,
          ""
        )
        .replace(
          /\b(an income|income)\b/g,
          ""
        );
  }

  descriptionText =
    descriptionText
      .replace(
        /\b\d{1,3}(?:[\s.,]\d{3})+\b/g,
        ""
      )
      .replace(
        /\b\d+(?:\.\d+)?\s*(thousand|million)\b/g,
        ""
      )
      .replace(/\b\d+\b/g, "")
      .replace(
        /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)\b/g,
        ""
      )
      .replace(/\b(pesos|peso|cop)\b/g, "")
      .replace(/\b(today|yesterday)\b/g, "")
      .replace(
        /\b(i|please|the|a|an|for|on|at|of|to|from|worth|value|and)\b/g,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();

  return descriptionText;
}


function extractEnglishExpenseDescription(text) {
  const descriptionText =
    cleanEnglishMovementDescription(
      text,
      "expense"
    );

  if (!descriptionText) {
    return movementT(
      "movements.voiceExpenseDefaultDescription",
      "Gasto registrado por voz"
    );
  }

  return (
    descriptionText.charAt(0).toUpperCase() +
    descriptionText.slice(1)
  );
}


function extractEnglishIncomeDescription(text) {
  const descriptionText =
    cleanEnglishMovementDescription(
      text,
      "income"
    );

  if (!descriptionText) {
    return movementT(
      "movements.voiceIncomeDefaultDescription",
      "Ingreso registrado por voz"
    );
  }

  return (
    descriptionText.charAt(0).toUpperCase() +
    descriptionText.slice(1)
  );
}


function getEnglishMovementVoiceDate(text) {
  const normalizedText =
    normalizeMoneyText(text);

  if (normalizedText.includes("today")) {
    return getLocalDate();
  }

  if (normalizedText.includes("yesterday")) {
    const yesterday = new Date();

    yesterday.setDate(
      yesterday.getDate() - 1
    );

    const year =
      yesterday.getFullYear();

    const month =
      String(
        yesterday.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        yesterday.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return getLocalDate();
}

function extractAmount(text) {
  if (getMovementsLocale() === "en-US") {
    const englishSpokenAmount =
      extractEnglishSpokenAmount(text);

    if (englishSpokenAmount) {
      return englishSpokenAmount;
    }
  }
  const cleanedText = normalizeMoneyText(text);
  const normalizedDigitsText = normalizeSeparatedDigits(cleanedText);

  // Caso 1: número completo al final
  // Ej: "almuerzo 252000", "pague internet 120000"
  const finalFullNumberMatch = normalizedDigitsText.match(/\b\d{4,9}\b\s*$/);

  if (finalFullNumberMatch) {
    return Number(finalFullNumberMatch[0].trim());
  }

  // Caso 2: número agrupado al final
  // Ej: "almuerzo 252 000", "almuerzo 252.000", "almuerzo 252,000"
  const finalGroupedNumberMatch = normalizedDigitsText.match(/\b\d{1,3}(?:[\s.,]\d{3})+\b\s*$/);

  if (finalGroupedNumberMatch) {
    return Number(finalGroupedNumberMatch[0].replace(/[\s.,]/g, '').trim());
  }

  // Caso 3: número + mil al final
  // Ej: "almuerzo 252 mil", "internet 120 mil"
  const finalMilMatch = normalizedDigitsText.match(/\b(\d+)\s*mil\b\s*$/);

  if (finalMilMatch) {
    return Number(finalMilMatch[1]) * 1000;
  }

  // Caso 4: número agrupado en cualquier parte
  // Ej: "gasté 252.000 en mercado", "gasté 252 000 en mercado"
  const groupedNumberMatch = normalizedDigitsText.match(/\b\d{1,3}(?:[\s.,]\d{3})+\b/);

  if (groupedNumberMatch) {
    return Number(groupedNumberMatch[0].replace(/[\s.,]/g, ''));
  }

  // Caso 5: número largo en cualquier parte
  // Ej: "gasté 252000 en mercado"
  const fullNumberMatch = normalizedDigitsText.match(/\b\d{4,9}\b/);

  if (fullNumberMatch) {
    return Number(fullNumberMatch[0]);
  }

  // Caso 6: número con mil
  // Ej: "gasté 252 mil", "gasté 25 mil 500"
  const numericMilMatch = normalizedDigitsText.match(/\b(\d+)\s*mil(?:\s+(\d{1,3}))?\b/);

  if (numericMilMatch) {
    const thousands = Number(numericMilMatch[1]) * 1000;
    const extra = numericMilMatch[2] ? Number(numericMilMatch[2]) : 0;

    return thousands + extra;
  }

  const spokenAmount = 
    extractSpokenAmount(normalizedDigitsText);

  if (spokenAmount) {
    return spokenAmount;
  }

  // Caso 7: millón / millones
  const numericMillionMatch = normalizedDigitsText.match(/\b(\d+)\s*(millon|millones)\b/);

  if (numericMillionMatch) {
    return Number(numericMillionMatch[1]) * 1000000;
  }
  

  // Caso 9: último número disponible
  // En gastos normalmente el valor suele decirse al final.
  const numbers = normalizedDigitsText.match(/\b\d+\b/g);

  if (numbers && numbers.length > 0) {
    return Number(numbers[numbers.length - 1]);
  }

  return '';
}

function normalizeMoneyText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSeparatedDigits(text) {
  let normalizedText = text;

  // Une números dictados como dígitos separados:
  // "2 5 2 0 0 0" -> "252000"
  normalizedText = normalizedText.replace(/\b(?:\d\s+){3,}\d\b/g, (match) => {
    return match.replace(/\s+/g, '');
  });

  // Une casos mixtos:
  // "2 52 000" -> "252000"
  // "25 2 000" -> "252000"
  normalizedText = normalizedText.replace(/\b\d{1,3}(?:\s+\d{1,3}){2,}\b/g, (match) => {
    const onlyDigits = match.replace(/\s+/g, '');

    if (onlyDigits.length >= 4) {
      return onlyDigits;
    }

    return match;
  });

  return normalizedText;
}

function extractSpokenAmount(text) {
  const tokens = text.split(' ').filter((token) => token.length > 0);

  const millionIndex = tokens.findIndex((token) => {
    return token === 'millon' || token === 'millones';
  });

  if (millionIndex !== -1) {
    const previousToken = tokens[millionIndex - 1];
    const nextToken = tokens[millionIndex + 1];

    const beforeMillion = getNumberWordsBefore(
      tokens,
      millionIndex
    );

    const afterMillion = getNumberWordsAfter(
      tokens,
      millionIndex
    );

    let millionValue = 1;

    if (
      previousToken &&
      /^\d+$/.test(previousToken)
    ) {
      millionValue = Number(previousToken);
    } else if (beforeMillion.length > 0) {
      millionValue = parseSmallSpanishNumber(
        beforeMillion
      );
    }

    let extraValue = 0;

    if (
      nextToken &&
      /^\d{1,3}$/.test(nextToken)
    ) {
      /*
      * Android suele convertir:
      * "un millón quinientos mil"
      * en:
      * "millón 500"
      */
      extraValue = Number(nextToken) * 1000;
    } else if (afterMillion.length > 0) {
      extraValue = parseSmallSpanishNumber(
        afterMillion
      );

      if (
        extraValue > 0 &&
        extraValue < 1000
      ) {
        extraValue *= 1000;
      }
    }

    return (
      millionValue * 1000000
    ) + extraValue;
  }

  const thousandIndex = tokens.findIndex((token) => token === 'mil');

  if (thousandIndex !== -1) {
    const beforeMil = getNumberWordsBefore(tokens, thousandIndex);
    const afterMil = getNumberWordsAfter(tokens, thousandIndex);

    const thousandValue = beforeMil.length > 0
      ? parseSmallSpanishNumber(beforeMil)
      : 1;

    const extraValue = afterMil.length > 0
      ? parseSmallSpanishNumber(afterMil)
      : 0;

    return (thousandValue * 1000) + extraValue;
  }

  const currencyIndex = tokens.findIndex((token) => {
    return token === 'peso' || token === 'pesos' || token === 'cop';
  });

  if (currencyIndex !== -1) {
    const beforeCurrency = getNumberWordsBefore(tokens, currencyIndex);

    if (beforeCurrency.length > 0) {
      return parseSmallSpanishNumber(beforeCurrency);
    }
  }

  const numberGroups = getNumberWordGroups(tokens);

  if (numberGroups.length === 0) {
    return 0;
  }

  const values = numberGroups.map((group) => parseSmallSpanishNumber(group));

  return Math.max(...values);
}

function getNumberWordsBefore(tokens, index) {
  const words = [];

  for (let i = index - 1; i >= 0; i--) {
    if (!isSpanishNumberToken(tokens[i])) {
      break;
    }

    words.unshift(tokens[i]);
  }

  return words;
}

function getNumberWordsAfter(tokens, index) {
  const words = [];

  for (let i = index + 1; i < tokens.length; i++) {
    if (!isSpanishNumberToken(tokens[i])) {
      break;
    }

    words.push(tokens[i]);
  }

  return words;
}

function getNumberWordGroups(tokens) {
  const groups = [];
  let currentGroup = [];

  tokens.forEach((token) => {
    if (isSpanishNumberToken(token)) {
      currentGroup.push(token);
      return;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function isSpanishNumberToken(token) {
  const numberTokens = [
    'un', 'uno', 'una',
    'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
    'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve',
    'veinte', 'veintiuno', 'veintidos', 'veintitres', 'veinticuatro',
    'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve',
    'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa',
    'cien', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos',
    'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
    'y'
  ];

  return numberTokens.includes(token);
}

function parseSmallSpanishNumber(words) {
  const units = {
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9
  };

  const specialNumbers = {
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
    veintiuno: 21,
    veintidos: 22,
    veintitres: 23,
    veinticuatro: 24,
    veinticinco: 25,
    veintiseis: 26,
    veintisiete: 27,
    veintiocho: 28,
    veintinueve: 29
  };

  const tens = {
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90
  };

  const hundreds = {
    cien: 100,
    ciento: 100,
    doscientos: 200,
    trescientos: 300,
    cuatrocientos: 400,
    quinientos: 500,
    seiscientos: 600,
    setecientos: 700,
    ochocientos: 800,
    novecientos: 900
  };

  let total = 0;

  words.forEach((word) => {
    if (word === 'y') {
      return;
    }

    if (units[word]) {
      total += units[word];
      return;
    }

    if (specialNumbers[word]) {
      total += specialNumbers[word];
      return;
    }

    if (tens[word]) {
      total += tens[word];
      return;
    }

    if (hundreds[word]) {
      total += hundreds[word];
    }
  });

  return total;
}


function extractCategory(text) {
  if (getMovementsLocale() === "en-US") {
    return extractEnglishExpenseCategory(text);
  }
  if (text.includes('factura') || text.includes('servicio') || text.includes('recibo')) {
    return 'Factura';
  }

  if (text.includes('comida') || text.includes('almuerzo') || text.includes('desayuno') || text.includes('mercado') || text.includes('alimentos')) {
    return 'Alimentación';
  }

  if (
      text.includes('transporte') ||
      text.includes('taxi') ||
      text.includes('uber') ||
      text.includes('pasaje') ||
      text.includes('pasajes') ||
      text.includes('tu llave') ||
      text.includes('bus') ||
      text.includes('transmilenio')
  ) {
      return 'Transporte';
  }

  if (text.includes('salud') || text.includes('medicina') || text.includes('doctor') || text.includes('cita médica')) {
    return 'Salud';
  }

  if (text.includes('cine') || text.includes('salida') || text.includes('entretenimiento')) {
    return 'Entretenimiento';
  }

  return 'Otro';
}


function extractDescription(text) {
  if (getMovementsLocale() === "en-US") {
    return extractEnglishExpenseDescription(text);
  }
  let descriptionText = text.toLowerCase();

  descriptionText = descriptionText
    .replace(/\b(agrega|añade|registra|guarda|anota)\b/g, '')
    .replace(/\b(gasté|gaste|pagué|pague|compré|compre|comprar|pagar)\b/g, '')
    .replace(/\bun gasto\b/g, '')
    .replace(/\bgasto\b/g, '')
    .replace(/\bpor valor de\b/g, '')
    .replace(/\bpor un valor de\b/g, '')
    .replace(/\bvalor de\b/g, '')
    .replace(/\b\d{1,3}(?:[\s.,]\d{3})+\b/g, '')
    .replace(/\b\d+\s*mil\b/g, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\b(pesos|peso|cop)\b/g, '')
    .replace(/\b(hoy|ayer)\b/g, '')
    .replace(/\b(en|de|por|para)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!descriptionText) {
    return 'Gasto registrado por voz';
  }

  return descriptionText.charAt(0).toUpperCase() + descriptionText.slice(1);
}


function extractDate(text) {
  if (getMovementsLocale() === "en-US") {
    return getEnglishMovementVoiceDate(text);
  }
  if (text.includes('hoy')) {
    return getLocalDate();
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (text.includes('ayer')) {
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  return getLocalDate();
}

async function downloadExpensesExcel() {
  const selectedMonth = monthFilter.value || getLocalMonth();

  const expenses = filteredExpenses || [];
  const additionalIncomes = currentAdditionalIncomes || [];

  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount);
  }, 0);

  const totalAdditionalIncomes = additionalIncomes.reduce((sum, income) => {
    return sum + Number(income.amount);
  }, 0);

  const totalIncome =
    Number(currentIncomeAmount || 0) +
    totalAdditionalIncomes;

  const savings = totalIncome - totalExpenses;

  const totalIncomeMovements =
    additionalIncomes.length +
    (Number(currentIncomeAmount || 0) > 0 ? 1 : 0);

  const totalMovements =
    totalIncomeMovements + expenses.length;

  if (
    totalIncome === 0 &&
    totalExpenses === 0
  ) {
    Swal.fire({
      title: movementT("movements.noDataExportTitle", "Sin datos para exportar"),
      text: movementT("movements.noDataExportText", "No hay ingresos ni gastos registrados para el mes seleccionado."),
      icon: 'info',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  const monthLabelRaw = getSelectedMonthLabel();
  const monthLabel = monthLabelRaw
    ? monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1)
    : selectedMonth;

  const workbook = XLSX.utils.book_new();

  const moneyFormat = '"$"#,##0';

  const palette = {
    wine: '3C0000',
    darkWine: '670010',
    red: '960018',
    coral: 'CB4C46',
    salmon: 'FF8478',
    rose: 'FFB0A8',
    blush: 'FFC7C1',
    pale: 'FFF1EF',
    white: 'FFFFFF',
    text: '3C0000',
    muted: '7A5A5A',
    border: 'E8C5C0'
  };

  const thinBorder = {
    top: { style: 'thin', color: { rgb: palette.border } },
    bottom: { style: 'thin', color: { rgb: palette.border } },
    left: { style: 'thin', color: { rgb: palette.border } },
    right: { style: 'thin', color: { rgb: palette.border } }
  };

  const styles = {
    title: {
      font: {
        bold: true,
        color: { rgb: palette.white },
        sz: 17
      },
      fill: { fgColor: { rgb: palette.wine } },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    },

    subtitle: {
      font: {
        bold: true,
        color: { rgb: palette.darkWine },
        sz: 11
      },
      fill: { fgColor: { rgb: palette.pale } },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      border: thinBorder
    },

    section: {
      font: {
        bold: true,
        color: { rgb: palette.white },
        sz: 11
      },
      fill: { fgColor: { rgb: palette.darkWine } },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      border: thinBorder
    },

    header: {
      font: {
        bold: true,
        color: { rgb: palette.white }
      },
      fill: { fgColor: { rgb: palette.red } },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true
      },
      border: thinBorder
    },

    label: {
      font: {
        bold: true,
        color: { rgb: palette.text }
      },
      fill: { fgColor: { rgb: palette.pale } },
      alignment: {
        vertical: 'center',
        wrapText: true
      },
      border: thinBorder
    },

    normal: {
      font: {
        color: { rgb: palette.text }
      },
      alignment: {
        vertical: 'center',
        wrapText: true
      },
      border: thinBorder
    },

    money: {
      font: {
        color: { rgb: palette.text }
      },
      numFmt: moneyFormat,
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      border: thinBorder
    },

    total: {
      font: {
        bold: true,
        color: { rgb: palette.wine }
      },
      fill: { fgColor: { rgb: palette.blush } },
      alignment: {
        vertical: 'center'
      },
      border: {
        top: { style: 'medium', color: { rgb: palette.red } },
        bottom: { style: 'thin', color: { rgb: palette.red } },
        left: { style: 'thin', color: { rgb: palette.red } },
        right: { style: 'thin', color: { rgb: palette.red } }
      }
    },

    totalMoney: {
      font: {
        bold: true,
        color: { rgb: palette.wine }
      },
      fill: { fgColor: { rgb: palette.blush } },
      numFmt: moneyFormat,
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      border: {
        top: { style: 'medium', color: { rgb: palette.red } },
        bottom: { style: 'thin', color: { rgb: palette.red } },
        left: { style: 'thin', color: { rgb: palette.red } },
        right: { style: 'thin', color: { rgb: palette.red } }
      }
    },

    balancePositive: {
      font: {
        bold: true,
        color: { rgb: palette.darkWine }
      },
      fill: { fgColor: { rgb: palette.rose } },
      numFmt: moneyFormat,
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      border: thinBorder
    },

    balanceNegative: {
      font: {
        bold: true,
        color: { rgb: palette.white }
      },
      fill: { fgColor: { rgb: palette.coral } },
      numFmt: moneyFormat,
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      border: thinBorder
    },

    empty: {
      font: {
        italic: true,
        color: { rgb: palette.muted }
      },
      fill: { fgColor: { rgb: palette.pale } },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      border: thinBorder
    }
  };

  function applyStyle(worksheet, cellAddress, style) {
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = style;
    }
  }

  function applyRowStyle(
    worksheet,
    rowNumber,
    startColumn,
    endColumn,
    style
  ) {
    for (let col = startColumn; col <= endColumn; col++) {
      const cellAddress = XLSX.utils.encode_cell({
        r: rowNumber - 1,
        c: col
      });

      applyStyle(worksheet, cellAddress, style);
    }
  }

  function applyDataRows(
    worksheet,
    startRow,
    endRow,
    startColumn,
    endColumn,
    moneyColumns = []
  ) {
    if (endRow < startRow) {
      return;
    }

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startColumn; col <= endColumn; col++) {
        const cellAddress = XLSX.utils.encode_cell({
          r: row - 1,
          c: col
        });

        const columnLetter = XLSX.utils.encode_col(col);

        applyStyle(
          worksheet,
          cellAddress,
          moneyColumns.includes(columnLetter)
            ? styles.money
            : styles.normal
        );
      }
    }
  }

  // ==================================================
  // HOJA 1: RESUMEN
  // ==================================================
  const summaryData = [
    [movementT("movements.reportTitle", "REPORTE MENSUAL - DÍA EN ORDEN"), "", "", ""],
    [`${movementT("movements.reportMonth", "Mes")}: ${monthLabel}`, '', '', ''],
    ['', '', '', ''],
    [movementT("movements.reportIncomeSection", "INGRESOS"), '', movementT("movements.reportExpensesBalanceSection", "GASTOS Y BALANCE"), ''],
    [
      movementT("movements.reportMonthlyIncome", "Ingreso mensual"),
      Number(currentIncomeAmount || 0),
      movementT("movements.reportTotalExpenses", "Total gastos"),
      totalExpenses
    ],
    [
      movementT("movements.reportOtherIncome", "Otros ingresos"),
      totalAdditionalIncomes,
      movementT("movements.reportBalanceSavings", "Balance / ahorro"),
      savings
    ],
    [
      movementT("movements.reportTotalIncome", "Total ingresos"),
      totalIncome,
      movementT("movements.reportMonthlyMovements", "Movimientos del mes"),
      totalMovements
    ],
    ['', '', '', ''],
    [movementT("movements.reportMonthlyIncomeDetail", "DETALLE DEL INGRESO MENSUAL"), '', '', ''],
    [
      movementT("movements.reportDescription", "Descripción"),
      incomeDescription.value || movementT("movements.reportNoDescription", "Sin descripción registrada"),
      '',
      ''
    ]
  ];

  const summaryWorksheet =
    XLSX.utils.aoa_to_sheet(summaryData);

  summaryWorksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 3 } },
    { s: { r: 9, c: 1 }, e: { r: 9, c: 3 } }
  ];

  summaryWorksheet['!cols'] = [
    { wch: 25 },
    { wch: 23 },
    { wch: 25 },
    { wch: 22 }
  ];

  applyRowStyle(summaryWorksheet, 1, 0, 3, styles.title);
  applyRowStyle(summaryWorksheet, 2, 0, 3, styles.subtitle);
  applyRowStyle(summaryWorksheet, 4, 0, 3, styles.section);

  ['A5', 'A6', 'A7', 'C5', 'C6', 'C7'].forEach((cell) => {
    applyStyle(summaryWorksheet, cell, styles.label);
  });

  ['B5', 'B6', 'B7', 'D5'].forEach((cell) => {
    applyStyle(summaryWorksheet, cell, styles.money);
  });

  applyStyle(
    summaryWorksheet,
    'D6',
    savings >= 0
      ? styles.balancePositive
      : styles.balanceNegative
  );

  applyStyle(summaryWorksheet, 'D7', styles.normal);

  applyRowStyle(summaryWorksheet, 9, 0, 3, styles.section);
  applyStyle(summaryWorksheet, 'A10', styles.label);
  applyStyle(summaryWorksheet, 'B10', styles.normal);
  applyStyle(summaryWorksheet, 'C10', styles.normal);
  applyStyle(summaryWorksheet, 'D10', styles.normal);

  XLSX.utils.book_append_sheet(
    workbook,
    summaryWorksheet,
    'Resumen'
  );

  // ==================================================
  // HOJA 2: INGRESOS
  // ==================================================
  const incomeRows = [
    [movementT("movements.reportIncomeTitle", "INGRESOS - DÍA EN ORDEN"), "", "", "", ""],
    [`${movementT("movements.reportMonth", "Mes")}: ${monthLabel}`, "", "", "", ""],
    ['', '', '', '', ''],
    [movementT("movements.reportType", "Tipo"), movementT("movements.reportDateMonth", "Fecha / Mes"), movementT("movements.reportDescription", "Descripción"), movementT("movements.reportAmount", "Valor"), movementT("movements.reportSource", "Origen")]
  ];

  let incomeDataCount = 0;

  if (
    Number(currentIncomeAmount || 0) > 0 ||
    String(incomeDescription.value || '').trim()
  ) {
    incomeRows.push([
      'Mensual',
      monthLabel,
      incomeDescription.value || 'Ingreso mensual principal',
      Number(currentIncomeAmount || 0),
      'Mensual'
    ]);

    incomeDataCount++;
  }

  additionalIncomes.forEach((income) => {
    incomeRows.push([
      movementT("movements.reportAdditional", "Adicional"),
      formatDate(income.income_date),
      income.description,
      Number(income.amount),
      getSourceLabel(income.source)
    ]);

    incomeDataCount++;
  });

  let incomeEmptyRow = null;

  if (incomeDataCount === 0) {
    incomeRows.push([
      'No hay ingresos registrados para este mes',
      '',
      '',
      '',
      ''
    ]);

    incomeEmptyRow = incomeRows.length;
  }

  incomeRows.push([
    'TOTAL INGRESOS',
    '',
    '',
    totalIncome,
    ''
  ]);

  const incomeTotalRow = incomeRows.length;

  const incomeWorksheet =
    XLSX.utils.aoa_to_sheet(incomeRows);

  incomeWorksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: incomeTotalRow - 1, c: 0 }, e: { r: incomeTotalRow - 1, c: 2 } }
  ];

  if (incomeEmptyRow) {
    incomeWorksheet['!merges'].push({
      s: { r: incomeEmptyRow - 1, c: 0 },
      e: { r: incomeEmptyRow - 1, c: 4 }
    });
  }

  incomeWorksheet['!cols'] = [
    { wch: 14 },
    { wch: 20 },
    { wch: 42 },
    { wch: 18 },
    { wch: 16 }
  ];

  incomeWorksheet['!autofilter'] = {
    ref: 'A4:E4'
  };

  applyRowStyle(incomeWorksheet, 1, 0, 4, styles.title);
  applyRowStyle(incomeWorksheet, 2, 0, 4, styles.subtitle);
  applyRowStyle(incomeWorksheet, 4, 0, 4, styles.header);

  const incomeDataStartRow = 5;
  const incomeDataEndRow = incomeTotalRow - 1;

  if (incomeDataCount > 0) {
    applyDataRows(
      incomeWorksheet,
      incomeDataStartRow,
      incomeDataEndRow,
      0,
      4,
      ['D']
    );
  }

  if (incomeEmptyRow) {
    applyRowStyle(
      incomeWorksheet,
      incomeEmptyRow,
      0,
      4,
      styles.empty
    );
  }

  applyRowStyle(
    incomeWorksheet,
    incomeTotalRow,
    0,
    4,
    styles.total
  );

  applyStyle(
    incomeWorksheet,
    `D${incomeTotalRow}`,
    styles.totalMoney
  );

  XLSX.utils.book_append_sheet(
    workbook,
    incomeWorksheet,
    movementT("movements.reportIncomeSheet", "Ingresos")
  );

  // ==================================================
  // HOJA 3: GASTOS
  // ==================================================
  const expenseRows = [
    [
      movementT(
        "movements.reportExpensesTitle",
        "GASTOS - DÍA EN ORDEN"
      ),
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    [
      `${movementT("movements.reportMonth", "Mes")}: ${monthLabel}`,
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    ["", "", "", "", "", "", ""],
    [
      movementT("movements.reportDate", "Fecha"),
      movementT("movements.reportCategory", "Categoría"),
      movementT("movements.reportDescription", "Descripción"),
      movementT("movements.reportAmount", "Valor"),
      movementT("movements.reportEvidence", "Evidencia"),
      movementT("movements.reportSource", "Origen"),
      movementT(
        "movements.reportRegistrationDate",
        "Fecha de registro"
      )
    ]
  ];

  let expenseEmptyRow = null;

  if (expenses.length > 0) {
    expenses.forEach((expense) => {
      expenseRows.push([
        formatDate(expense.expense_date),
        expense.category,
        expense.description,
        Number(expense.amount),
        expense.evidence_file_name ? 'Sí' : 'No',
        getSourceLabel(expense.source),
        formatDate(expense.created_at)
      ]);
    });
  } else {
    expenseRows.push([
      'No hay gastos registrados para este mes',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    expenseEmptyRow = expenseRows.length;
  }

  expenseRows.push([
    'TOTAL GASTOS DEL MES',
    '',
    '',
    totalExpenses,
    '',
    '',
    ''
  ]);

  const expenseTotalRow = expenseRows.length;

  const expensesWorksheet =
    XLSX.utils.aoa_to_sheet(expenseRows);

  expensesWorksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: expenseTotalRow - 1, c: 0 }, e: { r: expenseTotalRow - 1, c: 2 } }
  ];

  if (expenseEmptyRow) {
    expensesWorksheet['!merges'].push({
      s: { r: expenseEmptyRow - 1, c: 0 },
      e: { r: expenseEmptyRow - 1, c: 6 }
    });
  }

  expensesWorksheet['!cols'] = [
    { wch: 15 },
    { wch: 18 },
    { wch: 42 },
    { wch: 18 },
    { wch: 13 },
    { wch: 15 },
    { wch: 20 }
  ];

  expensesWorksheet['!autofilter'] = {
    ref: 'A4:G4'
  };

  applyRowStyle(expensesWorksheet, 1, 0, 6, styles.title);
  applyRowStyle(expensesWorksheet, 2, 0, 6, styles.subtitle);
  applyRowStyle(expensesWorksheet, 4, 0, 6, styles.header);

  if (expenses.length > 0) {
    applyDataRows(
      expensesWorksheet,
      5,
      expenseTotalRow - 1,
      0,
      6,
      ['D']
    );
  }

  if (expenseEmptyRow) {
    applyRowStyle(
      expensesWorksheet,
      expenseEmptyRow,
      0,
      6,
      styles.empty
    );
  }

  applyRowStyle(
    expensesWorksheet,
    expenseTotalRow,
    0,
    6,
    styles.total
  );

  applyStyle(
    expensesWorksheet,
    `D${expenseTotalRow}`,
    styles.totalMoney
  );

  XLSX.utils.book_append_sheet(
    workbook,
    expensesWorksheet,
    movementT("movements.reportExpensesSheet", "Gastos")
  );

  const fileName =
    `dia-en-orden-reporte-${selectedMonth}.xlsx`;

  const isNativeApp =
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform ===
      'function' &&
    window.Capacitor.isNativePlatform();

  /*
   * WEB
   */
  if (!isNativeApp) {
    XLSX.writeFile(workbook, fileName);

    await Swal.fire({
      title: movementT("movements.excelGeneratedTitle", "Excel generado"),
      text:
        movementT("movements.excelGeneratedText", "El reporte mensual fue descargado correctamente."),
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  /*
   * ANDROID
   */
  try {
    const CapacitorPlugins =
      window.Capacitor?.Plugins || {};

    const Filesystem =
      CapacitorPlugins.Filesystem;

    const Share =
      CapacitorPlugins.Share;

    if (!Filesystem || !Share) {
      throw new Error(
        'No se encontraron los plugins necesarios para exportar el archivo.'
      );
    }

    const excelBase64 = XLSX.write(
      workbook,
      {
        bookType: 'xlsx',
        type: 'base64'
      }
    );

    await Filesystem.writeFile({
      path: fileName,
      data: excelBase64,
      directory: 'CACHE',
      recursive: true
    });

    const fileInfo =
      await Filesystem.getUri({
        path: fileName,
        directory: 'CACHE'
      });

    await Share.share({
      title: movementT("movements.shareReportTitle", "Reporte mensual - Día en Orden"),
      text:
        `${movementT("movements.shareReportPrefix", "Reporte financiero de Día en Orden correspondiente a")} ${monthLabel}.`,
      url: fileInfo.uri,
      dialogTitle:
        movementT("movements.shareReportDialogTitle", "Guardar o compartir reporte")
    });

  } catch (error) {
    console.error(
      'Error al exportar Excel en Android:',
      error
    );

    await Swal.fire({
      title: movementT("movements.exportFailedTitle", "No se pudo exportar"),
      text:
        movementT("movements.exportFailedText", "El reporte fue generado, pero no se pudo guardar o compartir en el teléfono."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

async function loadMonthlyIncome() {
  const selectedMonth = monthFilter.value || getLocalMonth();

  try {
    const response = await fetch(`${INCOME_API_URL}?month=${selectedMonth}`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      currentIncomeAmount = 0;
      updateIncomePanel();
      renderActiveMobileMovementFilter();
      return;
    }

    if (!data.income) {
      currentIncomeAmount = 0;
      incomeAmount.value = '';
      incomeDescription.value = '';
      updateIncomePanel();
      renderActiveMobileMovementFilter();
      return;
    }

    currentIncomeAmount = Number(data.income.amount);
    incomeAmount.value = currentIncomeAmount;
    incomeDescription.value = data.income.description || '';

    updateIncomePanel();

  } catch (error) {
    console.error('Error al consultar ingreso mensual:', error);
  }
}

async function saveMonthlyIncome() {
  const selectedMonth = monthFilter.value || getLocalMonth();
  const amountValue = Number(incomeAmount.value);

  const isNewMonthlyIncome =
    !currentIncomeAmount ||
    Number(currentIncomeAmount) <= 0;

  if (!amountValue || amountValue < 0) {
    Swal.fire({
      title: movementT("movements.invalidIncomeTitle", "Ingreso inválido"),
      text: movementT("movements.invalidIncomeText", "Ingresa un valor válido para el ingreso mensual."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });
    return;
  }

  try {
    const response = await fetch(INCOME_API_URL, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        month_key: selectedMonth,
        amount: amountValue,
        description: incomeDescription.value || 'Ingreso mensual principal'
      })
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: movementT("movements.saveFailedTitle", "No se pudo guardar"),
        text: getMovementResponseText(data, "movements.incomeSaveErrorText", "Ocurrió un error al guardar el ingreso."),
        icon: 'error',
        confirmButtonColor: '#3c0000'
      });
      return;
    }

    if (
      isNewMonthlyIncome &&
      window.DANYBOT_ADS &&
      typeof window.DANYBOT_ADS.registerCreation === 'function'
    ) {
      window.DANYBOT_ADS.registerCreation();
      console.log('AdMob: ingreso mensual registrado');
    }

    currentIncomeAmount = amountValue;
    updateIncomePanel();

    Swal.fire({
      title: movementT("movements.incomeSavedTitle", "Ingreso guardado"),
      text: movementT("movements.incomeSavedText", "El ingreso mensual fue guardado correctamente."),
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

  } catch (error) {
    console.error('Error al guardar ingreso:', error);

    Swal.fire({
      title: 'Error',
      text: movementT("movements.monthlyIncomeSaveErrorText", "Ocurrió un error al guardar el ingreso mensual."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}


function updateIncomePanel() {
  monthlyIncome.textContent = formatMoney(currentIncomeAmount);
  additionalIncomeTotal.textContent = formatMoney(currentAdditionalIncomeTotal);
  updateSavings();
  updateExpenseCharts();
  highlightMonthlyIncomeTarget();
}


function updateSavings() {
  const savings =
    currentAdditionalIncomeTotal -
    currentExpensesTotal;

  monthlySavings.textContent =
    formatMoney(savings);

  monthlySavings.classList.remove(
    'positive-saving',
    'negative-saving'
  );

  if (savings >= 0) {
    monthlySavings.classList.add(
      'positive-saving'
    );
  } else {
    monthlySavings.classList.add(
      'negative-saving'
    );
  }
}

async function loadAdditionalIncomes() {
  const selectedMonth = monthFilter.value || getLocalMonth();

  try {
    const response = await fetch(`${INCOME_API_URL}/additional?month=${selectedMonth}`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      currentAdditionalIncomes = [];
      currentAdditionalIncomeTotal = 0;
      renderAdditionalIncomes();
      updateIncomePanel();
      renderActiveMobileMovementFilter();
      return;
    }

    currentAdditionalIncomes = data.additionalIncomes || [];

    currentAdditionalIncomeTotal = currentAdditionalIncomes.reduce((total, income) => {
      return total + Number(income.amount);
    }, 0);

    renderAdditionalIncomes();
    updateIncomePanel();
    renderActiveMobileMovementFilter();

  } catch (error) {
    console.error('Error al consultar ingresos adicionales:', error);
      renderActiveMobileMovementFilter();
  }
}

async function startVoiceIncome() {
  const isMobileApp =
    typeof window.isDanyBotRunningInMobileApp === 'function' &&
    window.isDanyBotRunningInMobileApp();

  if (!isMobileApp) {
    Swal.fire({
      title: movementT("movements.voiceUnavailableTitle", "Voz no disponible"),
      text: movementT("movements.incomeVoiceMobileOnlyText", "El dictado de ingresos está disponible en la aplicación móvil."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  if (
    typeof window.startDanyBotNativeSpeech !== 'function'
  ) {
    Swal.fire({
      title: movementT("movements.voiceUnavailableTitle", "Voz no disponible"),
      text: movementT("movements.nativeVoiceUnavailableText", "No se encontró la configuración de voz nativa."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  try {
    incomeVoiceButton.classList.add('listening');

    incomeVoiceButton.innerHTML = `
      <i class="bi bi-mic-fill"></i>
      ${movementT("movements.listening", "Escuchando...")}
    `;

    const result = await window.startDanyBotNativeSpeech({
      language: getMovementsLocale(),
      prompt: movementT("movements.incomeVoicePrompt", "Di el ingreso que quieres registrar")
    });

    incomeVoiceButton.classList.remove('listening');

    incomeVoiceButton.innerHTML = `
      <i class="bi bi-mic-fill"></i>
      ${movementT("movements.dictateIncomeVoice", "Dictar ingreso por voz")}
    `;

    if (!result.success) {
      Swal.fire({
        title: movementT("movements.couldNotListenTitle", "No se pudo escuchar"),
        text: getMovementVoiceErrorText(
          result.reason,
          "movements.noTextDetectedText",
          "No se detectó ningún texto."
        ),
        icon: 'warning',
        confirmButtonColor: '#3c0000'
      });

      return;
    }

    const transcript = result.text.toLowerCase();

    const detectedAmount = extractAmount(transcript);
    const detectedDate = extractDate(transcript);
    const detectedDescription =
      extractIncomeDescription(transcript);

    console.log(
      'INGRESO VOZ - TEXTO EXACTO:',
      JSON.stringify(transcript)
    );

    console.log(
      'INGRESO VOZ - DATOS EXACTOS:',
      JSON.stringify({
        amount: detectedAmount,
        date: detectedDate,
        description: detectedDescription
      })
    );

    additionalIncomeDate.value =
      detectedDate || getLocalDate();

    additionalIncomeDescription.value =
      detectedDescription;

    additionalIncomeAmount.value =
      detectedAmount || '';

    if (!detectedAmount || detectedAmount <= 0) {
      Swal.fire({
        title: movementT("movements.amountNotDetectedTitle", "No detecté el valor"),
        text: movementT("movements.incomeAmountNotDetectedText", "Revisa el ingreso y completa el valor manualmente."),
        icon: 'warning',
        confirmButtonColor: '#3c0000'
      });

      return;
    }

await saveAdditionalIncome('voice');

  } catch (error) {
    console.error(
      'Error en voz nativa de ingresos:',
      error
    );

    incomeVoiceButton.classList.remove('listening');

    incomeVoiceButton.innerHTML = `
      <i class="bi bi-mic-fill"></i>
      ${movementT("movements.dictateIncomeVoice", "Dictar ingreso por voz")}
    `;

    Swal.fire({
      title: movementT("movements.voiceErrorTitle", "Error de voz"),
      text: movementT("movements.voiceMicrophoneErrorText", "No fue posible usar el micrófono del celular."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

function extractIncomeDescription(text) {
  if (getMovementsLocale() === "en-US") {
    return extractEnglishIncomeDescription(text);
  }
  let descriptionText = text.toLowerCase();

  descriptionText = descriptionText
    .replace(
      /\b(agrega|añade|registra|guarda|anota)\b/g,
      ''
    )
    .replace(
      /\b(recibí|recibi|gané|gane|cobré|cobre)\b/g,
      ''
    )
    .replace(/\bun ingreso\b/g, '')
    .replace(/\bingreso\b/g, '')
    .replace(/\bpor valor de\b/g, '')
    .replace(/\bpor un valor de\b/g, '')
    .replace(/\bvalor de\b/g, '')
    .replace(/\b\d{1,3}(?:[\s.,]\d{3})+\b/g, '')
    .replace(/\b\d+\s*mil\b/g, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\b(pesos|peso|cop)\b/g, '')
    .replace(/\b(hoy|ayer)\b/g, '')
    .replace(/\b(de|por|para)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!descriptionText) {
    return 'Ingreso registrado por voz';
  }

  return (
    descriptionText.charAt(0).toUpperCase() +
    descriptionText.slice(1)
  );
}

async function saveAdditionalIncome(incomeSource = 'manual') {
  const selectedMonth = monthFilter.value || getLocalMonth();

  const additionalIncomeData = {
    month_key: selectedMonth,
    income_date: additionalIncomeDate.value || getLocalDate(),
    description: additionalIncomeDescription.value.trim(),
    amount: Number(additionalIncomeAmount.value),
    source: incomeSource
  };

  if (
    !additionalIncomeData.income_date ||
    !additionalIncomeData.description ||
    !additionalIncomeData.amount ||
    additionalIncomeData.amount <= 0
  ) {
    Swal.fire({
      title: movementT("movements.incompleteDataTitle", "Datos incompletos"),
      text: movementT("movements.incompleteAdditionalIncomeText", "Completa la fecha, descripción y valor del ingreso adicional."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });
    return;
  }

  const isEditing = editingAdditionalIncomeId !== null;

  const url = isEditing
    ? `${INCOME_API_URL}/additional/${editingAdditionalIncomeId}`
    : `${INCOME_API_URL}/additional`;

  const method = isEditing ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: getAuthHeaders(true),
      body: JSON.stringify(additionalIncomeData)
    });

    const data = await response.json();

    const savedIncomeId = isEditing
      ? editingAdditionalIncomeId
      : data.additionalIncomeId;
    
    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: isEditing
          ? movementT("movements.updateFailedTitle", "No se pudo actualizar")
          : movementT("movements.saveFailedTitle", "No se pudo guardar"),
        text: getMovementResponseText(data, "movements.additionalIncomeProcessErrorText", "Ocurrió un error al procesar el ingreso adicional."),
        icon: 'error',
        confirmButtonColor: '#3c0000'
      });
      return;
    }

    if (
      !isEditing &&
      window.DANYBOT_ADS &&
      typeof window.DANYBOT_ADS.registerCreation === 'function'
    ) {
      window.DANYBOT_ADS.registerCreation();
      console.log('AdMob: ingreso adicional registrado');
    }

    additionalIncomeDescription.value = '';
    additionalIncomeAmount.value = '';
    additionalIncomeDate.value = getLocalDate();

    editingAdditionalIncomeId = null;

    saveAdditionalIncomeButton.innerHTML = `
      <i class="bi bi-plus-circle"></i>
      ${movementT("movements.addAdditionalIncome", "Agregar ingreso adicional")}
    `;

    if (isDanyBotMobileApp()) {
      pendingIncomeCardToOpen = savedIncomeId;

      currentMobileMovementFilter = 'income';

      document
        .querySelectorAll('.mobile-movement-filter')
        .forEach((button) => {
          button.classList.toggle(
            'is-active',
            button.dataset.movementFilter === 'income'
          );
        });

      document.dispatchEvent(
        new CustomEvent(
          'danybot:close-movement-modal'
        )
      );

      await loadAdditionalIncomes();

      return;
    }

await loadAdditionalIncomes();

    Swal.fire({
      title: isEditing
        ? movementT("movements.additionalIncomeUpdatedTitle", "Ingreso adicional actualizado")
        : movementT("movements.additionalIncomeSavedTitle", "Ingreso adicional guardado"),
      text: isEditing
        ? movementT("movements.additionalIncomeUpdatedText", "El ingreso adicional fue actualizado correctamente.")
        : movementT("movements.additionalIncomeSavedText", "El ingreso adicional fue registrado correctamente."),
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

  } catch (error) {
    console.error('Error al procesar ingreso adicional:', error);

    Swal.fire({
      title: 'Error',
      text: movementT("movements.additionalIncomeProcessErrorText", "Ocurrió un error al procesar el ingreso adicional."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

async function deleteAdditionalIncome(additionalIncomeId) {
  try {
    const response = await fetch(`${INCOME_API_URL}/additional/${additionalIncomeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: movementT("movements.deleteFailedTitle", "No se pudo eliminar"),
        text: getMovementResponseText(data, "movements.additionalIncomeDeleteErrorText", "Ocurrió un error al eliminar el ingreso adicional."),
        icon: 'error',
        confirmButtonColor: '#3c0000'
      });
      return;
    }

    if (editingAdditionalIncomeId === additionalIncomeId) {
      editingAdditionalIncomeId = null;

      additionalIncomeDescription.value = '';
      additionalIncomeAmount.value = '';
      additionalIncomeDate.value = getLocalDate();

      saveAdditionalIncomeButton.innerHTML = `
        <i class="bi bi-plus-circle"></i>
        ${movementT("movements.addAdditionalIncome", "Agregar ingreso adicional")}
      `;
    }

    await loadAdditionalIncomes();

    if (isDanyBotMobileApp()) {
      currentMobileMovementFilter = 'income';

      document
        .querySelectorAll('.mobile-movement-filter')
        .forEach((button) => {
          button.classList.toggle(
            'is-active',
            button.dataset.movementFilter === 'income'
          );
        });

      renderActiveMobileMovementFilter();
      return;
    }

  } catch (error) {
    console.error('Error al eliminar ingreso adicional:', error);

    Swal.fire({
      title: 'Error',
      text: movementT("movements.additionalIncomeDeleteErrorText", "Ocurrió un error al eliminar el ingreso adicional."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

/* ==================================================
   ANDROID: FILTRO Y CARDS DE INGRESOS
   Reutiliza la lista visual de movimientos
   ================================================== */

function isDanyBotMobileApp() {
  return (
    document.documentElement.classList.contains('danybot-mobile-app') ||
    document.body.classList.contains('danybot-mobile-app')
  );
}

function escapeMovementText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSelectedMonthLabel() {
  const selectedMonth = monthFilter.value || getLocalMonth();

  if (!selectedMonth) {
    return movementT("movements.selectedMonth", "Mes seleccionado");
  }

  const [year, month] = selectedMonth.split('-');

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return new Intl.DateTimeFormat(getMovementsLocale(), {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function createMobileIncomeRow(income) {
  const description = escapeMovementText(
    income.description || movementT("movements.incomeLabel", "Ingreso")
  );

  const category = movementT("movements.incomeLabel", "Ingreso");

  const dateLabel = formatDate(
    income.income_date
  );

  const sourceLabel = getSourceLabel(
    income.source
  );

  const incomeId = income.id;

  const row = document.createElement('tr');

  row.dataset.additionalIncomeId = income.id;


  row.className = 'mobile-expense-row mobile-income-row';
  row.dataset.movementType = 'income';
  row.dataset.incomeId = incomeId;

  row.innerHTML = `
    <td colspan="7">
      <article class="mobile-expense-card mobile-income-card">

        <button
          type="button"
          class="mobile-expense-summary"
          aria-expanded="false"
        >
          <span class="mobile-expense-icon movement-income-icon">
            <i class="bi bi-arrow-right-circle"></i>
          </span>

          <span class="mobile-expense-main">
            <strong class="mobile-expense-description">
              ${description}
            </strong>

            <span class="mobile-expense-meta">
              <span class="mobile-expense-category">
                ${category}
              </span>

              <span class="mobile-expense-date">
                ${dateLabel}
              </span>
            </span>
          </span>

          <strong class="mobile-expense-value">
            ${formatMoney(income.amount)}
          </strong>

          <i
            class="bi bi-chevron-down mobile-expense-chevron"
            aria-hidden="true"
          ></i>
        </button>

        <div
          class="mobile-expense-details"
          hidden
        >
          <div class="mobile-expense-detail-grid">

            <div class="mobile-expense-detail">
              <span>${movementT("movements.type", "Tipo")}</span>
              <strong>${category}</strong>
            </div>

            <div class="mobile-expense-detail">
              <span>${movementT("movements.date", "Fecha")}</span>
              <strong>${dateLabel}</strong>
            </div>

            <div class="mobile-expense-detail">
              <span>${movementT("movements.source", "Origen")}</span>
              <strong>${escapeMovementText(sourceLabel)}</strong>
            </div>

            <div class="mobile-expense-detail">
              <span>${movementT("movements.value", "Valor")}</span>
              <strong>${formatMoney(income.amount)}</strong>
            </div>

            </div>

            <div class="mobile-expense-actions">
              <button
                type="button"
                class="mobile-expense-action edit mobile-income-edit-button"
              >
                <i class="bi bi-pencil"></i>
                ${movementT("movements.edit", "Editar")}
              </button>

              <button
                type="button"
                class="mobile-expense-action delete mobile-income-delete-button"
              >
                <i class="bi bi-trash"></i>
                ${movementT("movements.delete", "Eliminar")}
              </button>
            </div>

          </div>

        </article>
    </td>
  `;

  const card = row.querySelector('.mobile-expense-card');
  const summary = row.querySelector('.mobile-expense-summary');
  const details = row.querySelector('.mobile-expense-details');
  const chevron = row.querySelector('.mobile-expense-chevron');

  const editButton = row.querySelector(
    '.mobile-income-edit-button'
  );

  const deleteButton = row.querySelector(
    '.mobile-income-delete-button'
  );

  summary.addEventListener('click', () => {
    const willExpand = details.hidden;

    details.hidden = !willExpand;
    card.classList.toggle('is-expanded', willExpand);

    summary.setAttribute(
      'aria-expanded',
      String(willExpand)
    );

    chevron.classList.toggle(
      'bi-chevron-down',
      !willExpand
    );

    chevron.classList.toggle(
      'bi-chevron-up',
      willExpand
    );
  });

  editButton.addEventListener('click', () => {
    editingAdditionalIncomeId = income.id;

    additionalIncomeDate.value =
      income.income_date.split('T')[0];

    additionalIncomeDescription.value =
      income.description;

    additionalIncomeAmount.value =
      income.amount;

    saveAdditionalIncomeButton.innerHTML = `
      <i class="bi bi-check-circle"></i>
      ${movementT("movements.updateIncome", "Actualizar ingreso")}
    `;

    document.dispatchEvent(
      new CustomEvent(
        'danybot:open-income-edit-modal'
      )
    );
  });

  deleteButton.addEventListener('click', () => {
    deleteAdditionalIncome(income.id);
  });

  return row;
}

function focusMobileIncomeCard(incomeId) {
  if (!incomeId) {
    return;
  }

  const row = document.querySelector(
    `[data-additional-income-id="${incomeId}"]`
  );

  if (!row) {
    return;
  }

  const card = row.querySelector(
    '.mobile-expense-card'
  );

  if (!card) {
    return;
  }

  const summaryButton = card.querySelector(
    '.mobile-expense-summary'
  );

  const details = card.querySelector(
    '.mobile-expense-details'
  );

  const chevron = card.querySelector(
    '.mobile-expense-chevron'
  );

  if (summaryButton && details) {
    summaryButton.setAttribute(
      'aria-expanded',
      'true'
    );

    details.hidden = false;
    card.classList.add('is-expanded');

    if (chevron) {
      chevron.className =
        'bi bi-chevron-up mobile-expense-chevron';
    }
  }

  requestAnimationFrame(() => {
    row.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    card.classList.remove('search-result-row');

    requestAnimationFrame(() => {
      card.classList.add('search-result-row');

      setTimeout(() => {
        card.classList.remove(
          'search-result-row'
        );
      }, 2200);
    });

    if (
      typeof refreshExpensesListHeight ===
      'function'
    ) {
      refreshExpensesListHeight();
    }
  });
}

function renderMobileIncomes() {
  if (!isDanyBotMobileApp()) {
    return;
  }

  expensesTableBody.innerHTML = '';

  const incomes = [...currentAdditionalIncomes];

  incomes.sort((firstIncome, secondIncome) => {
    return new Date(secondIncome.income_date) -
      new Date(firstIncome.income_date);
  });

  if (incomes.length === 0) {
    expensesTableBody.innerHTML = `
      <tr class="mobile-expense-empty-row">
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-arrow-left-circle"></i>

            <h3>${movementT("movements.noIncomeTitle", "No hay ingresos para este mes")}</h3>

            <p>
              ${movementT("movements.noIncomeText", "Cuando registres un ingreso, aparecerá listado en esta sección.")}
            </p>
          </div>
        </td>
      </tr>
    `;

    return;
  }

  incomes.forEach((income) => {
    expensesTableBody.appendChild(
      createMobileIncomeRow(income)
    );
  });
}

if (pendingIncomeCardToOpen) {
  requestAnimationFrame(() => {
    focusMobileIncomeCard(
      pendingIncomeCardToOpen
    );

    pendingIncomeCardToOpen = null;
  });
}

function renderAllMobileMovements() {
  if (!isDanyBotMobileApp()) {
    return;
  }

  expensesTableBody.innerHTML = '';

  const expenses = Array.isArray(filteredExpenses)
    ? filteredExpenses
    : [];

  const incomes = Array.isArray(currentAdditionalIncomes)
    ? currentAdditionalIncomes
    : [];

  const movements = [
    ...expenses.map((expense) => ({
      type: 'expense',
      date: expense.expense_date,
      data: expense
    })),

    ...incomes.map((income) => ({
      type: 'income',
      date: income.income_date,
      data: income
    }))
  ];

  movements.sort((firstMovement, secondMovement) => {
    return (
      new Date(secondMovement.date) -
      new Date(firstMovement.date)
    );
  });

  if (movements.length === 0) {
    expensesTableBody.innerHTML = `
      <tr class="mobile-expense-empty-row">
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>

            <h3>${movementT("movements.noMovementsTitle", "No hay movimientos para este mes")}</h3>

            <p>
              ${movementT("movements.noMovementsText", "Cuando registres un ingreso o gasto, aparecerá listado en esta sección.")}
            </p>
          </div>
        </td>
      </tr>
    `;

    refreshExpensesListHeight();
    return;
  }

  movements.forEach((movement) => {
    const row =
      movement.type === 'income'
        ? createMobileIncomeRow(movement.data)
        : createMobileExpenseRow(movement.data);

    expensesTableBody.appendChild(row);
  });

  refreshExpensesListHeight();
}

function renderActiveMobileMovementFilter() {
  if (!isDanyBotMobileApp()) {
    return;
  }

  if (currentMobileMovementFilter === 'income') {
    renderMobileIncomes();
    return;
  }

  if (currentMobileMovementFilter === 'expense') {
    showExpenses(filteredExpenses);
    return;
  }

  renderAllMobileMovements();
}

function setupMobileMovementFilters() {
  if (!isDanyBotMobileApp()) {
    return;
  }

  const filterButtons = document.querySelectorAll(
    '.mobile-movement-filter'
  );

  if (!filterButtons.length) {
    return;
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentMobileMovementFilter =
        button.dataset.movementFilter || 'all';

      filterButtons.forEach((currentButton) => {
        currentButton.classList.toggle(
          'is-active',
          currentButton === button
        );
      });

      renderActiveMobileMovementFilter();
    });
  });
}


function renderAdditionalIncomes() {
  if (!currentAdditionalIncomes || currentAdditionalIncomes.length === 0) {
    additionalIncomesList.innerHTML = `
      <p class="empty-additional-income">
        ${movementT("movements.noAdditionalIncomes", "No hay ingresos adicionales registrados para este mes.")}
      </p>
    `;
    return;
  }

  additionalIncomesList.innerHTML = '';

  currentAdditionalIncomes.forEach((income) => {
    const card = document.createElement('div');

    card.classList.add('additional-income-card');
    card.dataset.additionalIncomeId = income.id;

    if (isSearchTarget('additional_income', income.id)) {
      card.classList.add('search-result-row');
    }

    card.innerHTML = `
      <div class="additional-income-card-info">
        <strong>${income.description}</strong>
        <span>${formatDate(income.income_date)} · ${getSourceLabel(income.source)}</span>
      </div>

      <div class="additional-income-card-amount">
        ${formatMoney(income.amount)}
      </div>

      <div class="additional-income-card-actions">
        <button 
          type="button" 
          class="edit-additional-income-btn"
          data-id="${income.id}"
        >
          <i class="bi bi-pencil"></i>
        </button>

        <button 
          type="button" 
          class="delete-additional-income-btn"
          data-id="${income.id}"
        >
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;

    const editButton = card.querySelector('.edit-additional-income-btn');
    const deleteButton = card.querySelector('.delete-additional-income-btn');

    editButton.addEventListener('click', () => {
        editingAdditionalIncomeId = income.id;

        additionalIncomeDate.value = income.income_date.split('T')[0];
        additionalIncomeDescription.value = income.description;
        additionalIncomeAmount.value = income.amount;

        saveAdditionalIncomeButton.innerHTML = `
         <i class="bi bi-check-circle"></i>
         ${movementT("movements.updateIncome", "Actualizar ingreso")}
        `;
    });

    deleteButton.addEventListener('click', () => {
      deleteAdditionalIncome(income.id);
    });

    additionalIncomesList.appendChild(card);

    if (isSearchTarget('additional_income', income.id)) {
      highlightSearchTargetElement(card);
    }
  });
}

function updateExpenseCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js no está cargado.');
    return;
  }

  renderCategoryExpensesChart();
  renderFinanceSummaryChart();
  renderDailyExpensesChart();
}

function renderCategoryExpensesChart() {
  const canvas = document.getElementById('categoryExpensesChart');

  if (!canvas) {
    return;
  }

  const categoryTotals = {};

  filteredExpenses.forEach((expense) => {
    const expenseCategory = expense.category || 'Otro';
    const expenseAmount = Number(expense.amount) || 0;

    if (!categoryTotals[expenseCategory]) {
      categoryTotals[expenseCategory] = 0;
    }

    categoryTotals[expenseCategory] += expenseAmount;
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  if (categoryExpensesChart) {
    categoryExpensesChart.destroy();
  }

  categoryExpensesChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sin gastos'],
      datasets: [
        {
          data: values.length ? values : [1],
          backgroundColor: [
            '#463cec',
            '#22c55e',
            '#0ea5e9',
            '#ec4899',
            '#f97316',
            '#ef4444',
            '#14b8a6',
            '#6b7280'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.raw || 0;

              if (!values.length) {
                return 'Sin gastos registrados';
              }

              return `${label}: ${formatMoney(value)}`;
            }
          }
        }
      }
    }
  });
}

function renderFinanceSummaryChart() {
  const canvas = document.getElementById('financeSummaryChart');

  if (!canvas) {
    return;
  }

  const totalIncome = currentIncomeAmount + currentAdditionalIncomeTotal;
  const totalExpenses = currentExpensesTotal;
  const savings = totalIncome - totalExpenses;

  if (financeSummaryChart) {
    financeSummaryChart.destroy();
  }

  financeSummaryChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [movementT("movements.reportIncomeSheet", "Ingresos"), movementT("movements.reportExpensesSheet", "Gastos"), movementT("movements.reportSavings", "Ahorro")],
      datasets: [
        {
          label: movementT("movements.reportMonthlySummary", "Resumen del mes"),
          data: [totalIncome, totalExpenses, savings],
          backgroundColor: [
            '#22c55e',
            '#ef4444',
            savings >= 0 ? '#463cec' : '#f97316'
          ],
          borderRadius: 12
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return formatMoney(context.raw || 0);
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return formatMoney(value);
            }
          }
        }
      }
    }
  });
}

function renderDailyExpensesChart() {
  const canvas = document.getElementById('dailyExpensesChart');

  if (!canvas) {
    return;
  }

  const selectedMonth = monthFilter.value || getLocalMonth();
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailyTotals = {};

  for (let day = 1; day <= daysInMonth; day++) {
    dailyTotals[day] = 0;
  }

  filteredExpenses.forEach((expense) => {
    const cleanDate = formatDateForInput(expense.expense_date);
    const expenseDay = Number(cleanDate.split('-')[2]);

    if (dailyTotals[expenseDay] !== undefined) {
      dailyTotals[expenseDay] += Number(expense.amount) || 0;
    }
  });

  const labels = Object.keys(dailyTotals).map((day) => `${movementT("movements.dayLabel", "Día")} ${day}`);
  const values = Object.values(dailyTotals);

  if (dailyExpensesChart) {
    dailyExpensesChart.destroy();
  }

  dailyExpensesChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Gastos diarios',
          data: values,
          borderColor: '#463cec',
          backgroundColor: 'rgba(70, 60, 236, 0.14)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return formatMoney(context.raw || 0);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatMoney(value);
            }
          }
        }
      }
    }
  });
}

function setupCollapsibleSections() {
  const collapseButtons = document.querySelectorAll('.collapse-section-btn');

  collapseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.collapseTarget;
      const content = document.getElementById(targetId);

      if (!content) {
        return;
      }

      const isCollapsed = content.classList.toggle('is-collapsed');
      if (targetId === 'expensesListContent') {
        requestAnimationFrame(refreshExpensesListHeight);
      }

      button.setAttribute('aria-expanded', String(!isCollapsed));

      const icon = button.querySelector('i');
      const text = button.querySelector('span');

      if (isCollapsed) {
        icon.className = 'bi bi-chevron-down';
        text.textContent = 'Mostrar';
      } else {
        icon.className = 'bi bi-chevron-up';
        text.textContent = 'Ocultar';

        setTimeout(() => {
          categoryExpensesChart?.resize();
          financeSummaryChart?.resize();
          dailyExpensesChart?.resize();
        }, 250);
      }
    });
  });
}

function setupMobileExpenseDate() {
  const isMobileApp =
    document.documentElement.classList.contains(
      'danybot-mobile-app'
    ) ||
    document.body.classList.contains(
      'danybot-mobile-app'
    );

  if (!isMobileApp) {
    return;
  }

  const toggleButton = document.getElementById(
    'toggleExpenseDateButton'
  );

  const dateControl = document.getElementById(
    'expenseDateControl'
  );

  const dateInput = document.getElementById(
    'expenseDate'
  );

  if (
    !toggleButton ||
    !dateControl ||
    !dateInput
  ) {
    return;
  }

  dateControl.hidden = true;

  toggleButton.addEventListener('click', () => {
    const willOpen = dateControl.hidden;

    dateControl.hidden = !willOpen;

    toggleButton.setAttribute(
      'aria-expanded',
      String(willOpen)
    );

    toggleButton.textContent = willOpen
      ? movementT("movements.useToday", "Usar fecha de hoy")
      : movementT("movements.changeDate", "Cambiar fecha");

    if (!willOpen) {
      dateInput.value = getLocalDate();
    }
  });
}

function renderMovementsMobileHeader() {
  const titleElement =
    document.getElementById('section-title');

  const dateTimeElement =
    document.getElementById('datetime');

  const avatarElement =
    document.getElementById('user-avatar');

  if (titleElement) {
    titleElement.textContent = movementT("movements.sectionTitle", "Movimientos");
  }

  if (dateTimeElement) {
    const now = new Date();

    const dateText = new Intl.DateTimeFormat(
      getMovementsLocale(),
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    ).format(now);

    const timeText = new Intl.DateTimeFormat(
      getMovementsLocale(),
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
    ).format(now);

    dateTimeElement.textContent =
      `${dateText} · ${timeText}`;
  }

  if (!avatarElement) {
    return;
  }

  if (user.picture) {
    avatarElement.src = user.picture;
    avatarElement.alt =
      `${movementT("movements.photoOf", "Foto de")} ${user.name || movementT("movements.user", "usuario")}`;
    avatarElement.style.display = 'block';
    return;
  }

  const initials = String(user.name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  const avatarSvg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="96"
         height="96"
         viewBox="0 0 96 96">
      <rect width="96"
            height="96"
            rx="48"
            fill="#cb4c46"/>
      <text x="48"
            y="57"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="32"
            font-weight="700"
            fill="#ffffff">${initials}</text>
    </svg>
  `;

  avatarElement.src =
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(avatarSvg)}`;

  avatarElement.alt =
    `Iniciales de ${user.name || 'usuario'}`;

  avatarElement.style.display = 'block';
}

// =====================================================
// CARGADOR INICIAL DE MOVIMIENTOS MÓVIL
// =====================================================

let danyBotMovementsLoaderTimeout = null;

function showDanyBotMovementsLoader() {
  if (!isDanyBotMobileApp()) {
    return;
  }

  if (document.getElementById('danyBotMovementsLoader')) {
    return;
  }

  const loader = document.createElement('div');

  loader.id = 'danyBotMovementsLoader';
  loader.className = 'danybot-movements-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');

  loader.innerHTML = `
    <div class="danybot-movements-loader-content">
      <img
        src="./src/img/danybot.png"
        alt=""
        aria-hidden="true"
      >

      <p>${movementT("movements.loading", "Cargando tus movimientos")}</p>

      <div
        class="danybot-movements-loader-dots"
        aria-hidden="true"
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  document.body.appendChild(loader);

  danyBotMovementsLoaderTimeout = window.setTimeout(() => {
    hideDanyBotMovementsLoader();
  }, 12000);
}

function hideDanyBotMovementsLoader() {
  const loader = document.getElementById(
    'danyBotMovementsLoader'
  );

  if (danyBotMovementsLoaderTimeout) {
    window.clearTimeout(
      danyBotMovementsLoaderTimeout
    );

    danyBotMovementsLoaderTimeout = null;
  }

  if (!loader) {
    return;
  }

  loader.classList.add('is-leaving');

  window.setTimeout(() => {
    loader.remove();
  }, 220);
}

document.addEventListener('DOMContentLoaded', () => {
  renderMovementsMobileHeader();
  
  setTodayDate();
  setCurrentMonthFilter();
  setupCollapsibleSections();
  openIncomePanelForSearchTarget();

  additionalIncomeDate.value = getLocalDate();

  if (expenseEvidence && expenseEvidenceName) {
    expenseEvidence.addEventListener('change', () => {
      const file = expenseEvidence.files[0];

      if (file) {
        expenseEvidenceName.textContent = file.name;
      } else {
        expenseEvidenceName.textContent = movementT("movements.noEvidenceFileSelected", "Ningún archivo seleccionado");
      }
    });
  }

  showDanyBotMovementsLoader();

  Promise.allSettled([
    loadExpenses(),
    loadMonthlyIncome(),
    loadAdditionalIncomes()
  ]).finally(() => {
    hideDanyBotMovementsLoader();

    const searchTarget =
      getExpenseSearchTarget();

    if (
      isDanyBotMobileApp() &&
      searchTarget.type === 'expense' &&
      searchTarget.id
    ) {
      requestAnimationFrame(() => {
        focusExpenseCard(
          searchTarget.id
        );
      });
    }
  });

  expenseForm.addEventListener('submit', saveExpense);
  cancelEditButton.addEventListener('click', resetFormMode);

  monthFilter.addEventListener('change', async () => {
    applyMonthFilter();
    await loadMonthlyIncome();
    await loadAdditionalIncomes();
  });

  voiceButton.addEventListener('click', startVoiceExpense);
  incomeVoiceButton.addEventListener(
    'click',
    startVoiceIncome
  );

  downloadExcelButton.addEventListener(
    'click',
    async () => {
      try {
        if (
          window.DANYBOT_ADS &&
          typeof window.DANYBOT_ADS.showReportInterstitial === 'function'
        ) {
          await window.DANYBOT_ADS.showReportInterstitial();
        }
      } catch (error) {
        console.warn(
          'AdMob: anuncio de reporte no disponible:',
          error
        );
      }

      await downloadExpensesExcel();
    }
  );
  saveIncomeButton.addEventListener(
    'click',
    saveMonthlyIncome
  );

  saveAdditionalIncomeButton.addEventListener(
    'click',
    () => saveAdditionalIncome('manual')
  );

  setupMobileMovementFilters();
  });

/* ==================================================
   MODAL MÓVIL: NUEVO MOVIMIENTO
   Reutiliza los formularios existentes
   ================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const openButton = document.getElementById("openMovementOptionsButton");
  const modal = document.getElementById("movementOptionsModal");
  const modalHeader = modal?.querySelector(".movement-options-header");
  const optionsGrid = modal?.querySelector(".movement-options-grid");

  const formView = document.getElementById("movementFormView");
  const formHost = document.getElementById("movementFormHost");
  const formTitle = document.getElementById("movementFormTitle");
  const backButton = document.getElementById("backToMovementOptionsButton");
  const incomeTypeSelector = document.getElementById(
    "mobileIncomeTypeSelector"
  );

  const incomeTypeButtons = document.querySelectorAll(
    "[data-income-form-type]"
  );

  const closeButtons = document.querySelectorAll(
    "[data-close-movement-modal]"
  );

  const optionButtons = document.querySelectorAll(
    "[data-movement-option]"
  );

  let currentForm = null;
  let currentPlaceholder = null;

  if (
    !openButton ||
    !modal ||
    !modalHeader ||
    !optionsGrid ||
    !formView ||
    !formHost
  ) {
    return;
  }

  function getMovementForm(option) {
    if (option === "expense") {
      return {
        title: movementT("movements.addExpenseOption", "Agregar gasto"),
        element: document.querySelector(".expenses-form-section")
      };
    }

    if (option === "income") {
      return {
        title: movementT("movements.addIncome", "Agregar ingreso"),
        element: document
          .getElementById("additionalIncomeDate")
          ?.closest(".income-form-box")
      };
    }

    return null;
  }

  function restoreCurrentForm() {
    if (
      !currentForm ||
      !currentPlaceholder ||
      !currentPlaceholder.parentNode
    ) {
      currentForm = null;
      currentPlaceholder = null;
      return;
    }

    currentPlaceholder.parentNode.insertBefore(
      currentForm,
      currentPlaceholder
    );

    currentPlaceholder.remove();
    currentForm.classList.remove("is-in-movement-modal");

    currentForm = null;
    currentPlaceholder = null;
  }
  
  function setActiveIncomeType(type) {
    const option =
      type === "additional"
        ? "additional-income"
        : "income";

    showMovementForm(option, {
      keepIncomeSelector: true
    });

    incomeTypeButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.incomeFormType === type
      );
    });
  }

  function showOptions() {
    restoreCurrentForm();

    modalHeader.classList.remove("is-hidden");
    optionsGrid.classList.remove("is-hidden");

    formView.hidden = true;
    formHost.innerHTML = "";
       if (incomeTypeSelector) {
        incomeTypeSelector.hidden = true;
      }
  }

  function showMovementForm(option, settings = {}) {
    const movementForm = getMovementForm(option);

    if (!movementForm?.element) {
      console.error(
        `No se encontró el formulario para la opción: ${option}`
      );

      return;
    }

    restoreCurrentForm();

    currentForm = movementForm.element;

    currentPlaceholder = document.createComment(
      `Posición original: ${option}`
    );

    currentForm.parentNode.insertBefore(
      currentPlaceholder,
      currentForm
    );

    currentForm.classList.add("is-in-movement-modal");
    formHost.appendChild(currentForm);

    if (option === "expense") {
      const expenseContent =
        document.getElementById("expenseFormContent");

      if (expenseContent) {
        expenseContent.classList.remove("is-collapsed");
      }
    }

    formTitle.textContent = movementForm.title;

    modalHeader.classList.add("is-hidden");
    optionsGrid.classList.add("is-hidden");

    formView.hidden = false;

    const isIncomeOption =
      option === "income" ||
      option === "additional-income";

    if (incomeTypeSelector) {
      incomeTypeSelector.hidden =
        isDanyBotMobileApp()
          ? true
          : !isIncomeOption;
    }

    if (
      isDanyBotMobileApp() &&
      option === "income"
    ) {
      const incomeHeading =
        movementForm.element.querySelector("h3");

      if (incomeHeading) {
        incomeHeading.textContent = movementT("movements.incomeLabel", "Ingreso");
      }

      saveAdditionalIncomeButton.innerHTML = `
        <i class="bi bi-plus-circle"></i>
        ${movementT("movements.addIncomeShort", "Agregar ingreso")}
      `;
    }

    if (
        (option === "income" ||
        option === "additional-income") &&
        !settings.keepIncomeSelector
    ) {
      incomeTypeButtons.forEach((button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.incomeFormType === "principal"
        );
      });
    }
  }

  function openMovementModal() {
    showOptions();

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("movement-modal-open");
  }

  function openMovementFormModal(option, title) {
    showMovementForm(option);

    if (title) {
      formTitle.textContent = title;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("movement-modal-open");
  }

  function closeMovementModal() {
    restoreCurrentForm();

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("movement-modal-open");

    modalHeader.classList.remove("is-hidden");
    optionsGrid.classList.remove("is-hidden");
    formView.hidden = true;
    formHost.innerHTML = "";
    if (incomeTypeSelector) {
      incomeTypeSelector.hidden = true;
    }
  }

  document.addEventListener(
    "danybot:open-expense-edit-modal",
    () => {
      openMovementFormModal("expense", "Editar gasto");
    }
  );

  document.addEventListener(
    "danybot:open-income-edit-modal",
    () => {
      openMovementFormModal(
        "income",
        "Editar ingreso"
      );
    }
  );

  document.addEventListener(
    "danybot:close-movement-modal",
    closeMovementModal
  );

  openButton.addEventListener("click", openMovementModal);

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showMovementForm(button.dataset.movementOption);
    });
  });

  incomeTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveIncomeType(
        button.dataset.incomeFormType
      );
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeMovementModal);
  });

  backButton?.addEventListener("click", showOptions);

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      modal.classList.contains("is-open")
    ) {
      closeMovementModal();
    }
  });
});


