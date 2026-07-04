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

let categoryExpensesChart = null;
let financeSummaryChart = null;
let dailyExpensesChart = null;

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

    await Swal.fire({
      title: editingId ? 'Gasto actualizado' : 'Gasto registrado',
      text: editingId
        ? 'La información del gasto fue actualizada correctamente.'
        : 'El gasto fue guardado correctamente.',
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

    expenseMessage.textContent = '';

    resetFormMode();

    loadExpenses();

  } catch (error) {
    console.error('Error al guardar gasto:', error);
    expenseMessage.textContent = 'Ocurrió un error al guardar el gasto.';
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
      title: 'Archivo no permitido',
      text: 'La evidencia debe ser PDF, JPG, PNG o WEBP.',
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return false;
  }

  if (file.size > maxSizeBytes) {
    Swal.fire({
      title: 'Archivo muy pesado',
      text: 'La evidencia no puede superar los 5 MB.',
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
        Sin evidencia
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
      Ver
    </button>
  `;
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
      let message = 'No se pudo abrir la evidencia.';

      try {
        const data = await response.json();
        message = data.mensaje || message;
      } catch (error) {
        console.error('No se pudo leer el error de evidencia:', error);
      }

      Swal.fire({
        title: 'Evidencia no disponible',
        text: message,
        icon: 'warning',
        confirmButtonColor: '#3c0000'
      });

      return;
    }

    const blob = await response.blob();
    const fileUrl = URL.createObjectURL(blob);

    window.open(fileUrl, '_blank');

    setTimeout(() => {
      URL.revokeObjectURL(fileUrl);
    }, 60000);

  } catch (error) {
    console.error('Error al abrir evidencia:', error);

    Swal.fire({
      title: 'Error',
      text: 'Ocurrió un error al abrir la evidencia.',
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



// Esta función pinta los gastos en la tabla.
function showExpenses(expenses) {
  expensesTableBody.innerHTML = '';

  if (expenses.length === 0) {
    expensesTableBody.innerHTML = `
        <tr>
            <td colspan="7">
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h3>No hay gastos para este mes</h3>
                <p>Cuando registres un gasto, aparecerá listado en esta sección.</p>
            </div>
            </td>
        </tr>
        `;
    return;
  }

  expenses.forEach((expense) => {
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
        <span class="category-badge ${getCategoryClass(expense.category)}">
        ${expense.category}
        </span>
    </td>

    <td>
        <strong class="expense-description">${expense.description}</strong>
    </td>

    <td>
        <strong class="amount-cell">${formatMoney(expense.amount)}</strong>
    </td>

    <td>
        ${renderEvidenceCell(expense)}
    </td>

    <td>
        <span class="source-badge ${getSourceClass(expense.source)}">
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
    Pasajes: 'badge-cyan',
    Salud: 'badge-red',
    Entretenimiento: 'badge-pink',
    Otro: 'badge-gray'
  };

  return categoryClasses[category] || 'badge-gray';
}

// Esta función muestra el nombre del origen de forma más amigable.
function getSourceLabel(source) {
  const labels = {
    manual: 'Manual',
    voice: 'Por voz'
  };

  return labels[source] || 'Manual';
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
    return '';
  }

  const [year, month, day] = cleanDate.split('-');

  if (!year || !month || !day) {
    return cleanDate;
  }

  return `${day}/${month}/${year}`;
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

// Esta función carga un gasto en el formulario para poder editarlo.
function startEditExpense(id) {
  const expense = currentExpenses.find((item) => item.id === id);

  if (!expense) {
    expenseMessage.textContent = 'No se encontró el gasto para editar.';
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

  submitExpenseButton.innerHTML = '<i class="bi bi-check2-circle"></i> Actualizar gasto';
  cancelEditButton.style.display = 'block';

  expenseMessage.textContent = expense.evidence_file_name
    ? 'Editando gasto seleccionado. Si adjuntas una nueva evidencia, reemplazará la anterior.'
    : 'Editando gasto seleccionado. Puedes adjuntar una evidencia opcional.';
}

// Esta función elimina un gasto desde la pantalla.
async function deleteExpense(expenseId) {
  const result = await Swal.fire({
    title: '¿Eliminar gasto?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3c0000',
    cancelButtonColor: '#6b7280'
  });

  if (!result.isConfirmed) {
    return;
  }

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
        title: 'No se pudo eliminar',
        text: data.mensaje || 'Ocurrió un error.',
        icon: 'error',
      confirmButtonColor: '#3c0000'
      });
      return;
    }

    await Swal.fire({
      title: 'Gasto eliminado',
      text: 'El gasto fue eliminado correctamente.',
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

    loadExpenses();

  } catch (error) {
    console.error('Error al eliminar gasto:', error);

    Swal.fire({
      title: 'Error',
      text: 'Ocurrió un error al eliminar el gasto.',
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

  submitExpenseButton.innerHTML = '<i class="bi bi-save2"></i> Guardar gasto';
  cancelEditButton.style.display = 'none';

  setTodayDate();
}

function startVoiceExpense() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    Swal.fire({
      title: 'Reconocimiento de voz no disponible',
      text: 'Tu navegador no permite usar dictado por voz en esta página. Prueba con Chrome.',
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = 'es-CO';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceButton.classList.add('listening');
  voiceButton.innerHTML = '<i class="bi bi-mic-fill"></i> Escuchando...';

  recognition.start();

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();

    voiceText.textContent = `Texto detectado: "${transcript}"`;

    await fillExpenseFromVoice(transcript);
  };

  recognition.onerror = () => {
    Swal.fire({
      title: 'No se pudo escuchar',
      text: 'Revisa el permiso del micrófono o intenta hablar más cerca del dispositivo.',
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  };

  recognition.onend = () => {
    voiceButton.classList.remove('listening');
    voiceButton.innerHTML = '<i class="bi bi-mic-fill"></i> Dictar gasto por voz';
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
    description: detectedDescription || 'Gasto registrado por voz',
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
      title: 'Estás editando un gasto',
      text: 'Termina o cancela la edición antes de guardar un gasto por voz automáticamente.',
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  if (!detectedExpense.amount || detectedExpense.amount <= 0) {
    Swal.fire({
      title: 'No detecté el valor',
      text: 'No pude identificar el monto del gasto. Revisa el formulario y guárdalo manualmente.',
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
        title: 'No se pudo guardar',
        text: data.mensaje || 'No se pudo guardar el gasto por voz.',
        icon: 'error',
      confirmButtonColor: '#3c0000'
      });

      return;
    }

    const expenseMonth = expenseData.expense_date.slice(0, 7);

    if (monthFilter.value !== expenseMonth) {
      monthFilter.value = expenseMonth;
      await loadMonthlyIncome();
      await loadAdditionalIncomes();
    }

    await loadExpenses();

    resetFormMode();

    Swal.fire({
      title: 'Gasto guardado automáticamente',
      text: `${expenseData.description} por ${formatMoney(expenseData.amount)} fue registrado correctamente.`,
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
      text: 'Ocurrió un error al guardar el gasto por voz.',
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

function extractAmount(text) {
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

  // Caso 7: millón / millones
  const numericMillionMatch = normalizedDigitsText.match(/\b(\d+)\s*(millon|millones)\b/);

  if (numericMillionMatch) {
    return Number(numericMillionMatch[1]) * 1000000;
  }

  // Caso 8: valores dictados en palabras
  // Ej: "doscientos cincuenta y dos mil"
  const spokenAmount = extractSpokenAmount(normalizedDigitsText);

  if (spokenAmount) {
    return spokenAmount;
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
    const beforeMillion = getNumberWordsBefore(tokens, millionIndex);
    const afterMillion = getNumberWordsAfter(tokens, millionIndex);

    const millionValue = beforeMillion.length > 0
      ? parseSmallSpanishNumber(beforeMillion)
      : 1;

    const extraValue = afterMillion.length > 0
      ? parseSmallSpanishNumber(afterMillion)
      : 0;

    return (millionValue * 1000000) + extraValue;
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
  if (text.includes('factura') || text.includes('servicio') || text.includes('recibo')) {
    return 'Factura';
  }

  if (text.includes('comida') || text.includes('almuerzo') || text.includes('desayuno') || text.includes('mercado') || text.includes('alimentos')) {
    return 'Alimentación';
  }

  if (text.includes('transporte') || text.includes('taxi') || text.includes('uber')) {
    return 'Transporte';
  }

  if (text.includes('pasaje') || text.includes('pasajes') || text.includes('tu llave') || text.includes('bus') || text.includes('transmilenio')) {
    return 'Pasajes';
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

function downloadExpensesExcel() {
  const selectedMonth = monthFilter.value || getLocalMonth();

  const expenses = filteredExpenses || [];
  const additionalIncomes = currentAdditionalIncomes || [];

  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount);
  }, 0);

  const totalAdditionalIncomes = additionalIncomes.reduce((sum, income) => {
    return sum + Number(income.amount);
  }, 0);

  const savings = currentIncomeAmount + totalAdditionalIncomes - totalExpenses;

  if (
    currentIncomeAmount === 0 &&
    totalAdditionalIncomes === 0 &&
    totalExpenses === 0
  ) {
    Swal.fire({
      title: 'Sin datos para exportar',
      text: 'No hay ingresos ni gastos registrados para el mes seleccionado.',
      icon: 'info',
      confirmButtonColor: '#3c0000'
    });

    return;
  }

  const workbook = XLSX.utils.book_new();

  const moneyFormat = '"$"#,##0';

  const styles = {
    title: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 },
      fill: { fgColor: { rgb: '463CEC' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    },
    header: {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '463CEC' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left: { style: 'thin', color: { rgb: 'D1D5DB' } },
        right: { style: 'thin', color: { rgb: 'D1D5DB' } }
      }
    },
    label: {
      font: { bold: true, color: { rgb: '111827' } },
      fill: { fgColor: { rgb: 'EEF2FF' } },
      border: {
        top: { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left: { style: 'thin', color: { rgb: 'D1D5DB' } },
        right: { style: 'thin', color: { rgb: 'D1D5DB' } }
      }
    },
    normal: {
      alignment: { vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
        left: { style: 'thin', color: { rgb: 'E5E7EB' } },
        right: { style: 'thin', color: { rgb: 'E5E7EB' } }
      }
    },
    money: {
      numFmt: moneyFormat,
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
        left: { style: 'thin', color: { rgb: 'E5E7EB' } },
        right: { style: 'thin', color: { rgb: 'E5E7EB' } }
      }
    },
    total: {
      font: { bold: true, color: { rgb: '111827' } },
      fill: { fgColor: { rgb: 'DBEAFE' } },
      numFmt: moneyFormat,
      border: {
        top: { style: 'thin', color: { rgb: '93C5FD' } },
        bottom: { style: 'thin', color: { rgb: '93C5FD' } },
        left: { style: 'thin', color: { rgb: '93C5FD' } },
        right: { style: 'thin', color: { rgb: '93C5FD' } }
      }
    },
    positive: {
      font: { bold: true, color: { rgb: '166534' } },
      fill: { fgColor: { rgb: 'DCFCE7' } },
      numFmt: moneyFormat
    },
    negative: {
      font: { bold: true, color: { rgb: '991B1B' } },
      fill: { fgColor: { rgb: 'FEE2E2' } },
      numFmt: moneyFormat
    }
  };

  function applyStyle(worksheet, cellAddress, style) {
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = style;
    }
  }

  function applyTableStyle(worksheet, moneyColumns = []) {
    if (!worksheet['!ref']) return;

    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });

        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = styles.normal;

        const columnLetter = XLSX.utils.encode_col(col);

        if (moneyColumns.includes(columnLetter)) {
          worksheet[cellAddress].s = styles.money;
        }
      }
    }
  }

  function applyHeaderStyle(worksheet, rowNumber, startColumn, endColumn) {
    for (let col = startColumn; col <= endColumn; col++) {
      const cellAddress = XLSX.utils.encode_cell({
        r: rowNumber - 1,
        c: col
      });

      applyStyle(worksheet, cellAddress, styles.header);
    }
  }

  // Hoja 1: Resumen
  const summaryData = [
    ['REPORTE MENSUAL DANYBOT', ''],
    [],
    ['Mes', selectedMonth],
    ['Ingreso mensual principal', currentIncomeAmount],
    ['Descripción ingreso mensual', incomeDescription.value || 'Sin descripción'],
    ['Total ingresos adicionales', totalAdditionalIncomes],
    ['Total gastos', totalExpenses],
    ['Ahorro final', savings]
  ];

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);

  summaryWorksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
  ];

  summaryWorksheet['!cols'] = [
    { wch: 35 },
    { wch: 30 }
  ];

  applyStyle(summaryWorksheet, 'A1', styles.title);

  ['A3', 'A4', 'A5', 'A6', 'A7', 'A8'].forEach((cell) => {
    applyStyle(summaryWorksheet, cell, styles.label);
  });

  ['B3', 'B5'].forEach((cell) => {
    applyStyle(summaryWorksheet, cell, styles.normal);
  });

  ['B4', 'B6', 'B7'].forEach((cell) => {
    applyStyle(summaryWorksheet, cell, styles.money);
  });

  applyStyle(summaryWorksheet, 'B8', savings >= 0 ? styles.positive : styles.negative);

  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');

  // Hoja 2: Ingresos adicionales
  const additionalIncomeRows = [
    ['Fecha', 'Descripción', 'Valor', 'Origen']
  ];

  if (additionalIncomes.length > 0) {
    additionalIncomes.forEach((income) => {
      additionalIncomeRows.push([
        formatDate(income.income_date),
        income.description,
        Number(income.amount),
        getSourceLabel(income.source)
      ]);
    });

    additionalIncomeRows.push([]);
    additionalIncomeRows.push([
      '',
      'TOTAL INGRESOS ADICIONALES',
      totalAdditionalIncomes,
      ''
    ]);
  } else {
    additionalIncomeRows.push([
      '',
      'No hay ingresos adicionales registrados para este mes',
      '',
      ''
    ]);
  }

  const additionalIncomeWorksheet = XLSX.utils.aoa_to_sheet(additionalIncomeRows);

  additionalIncomeWorksheet['!cols'] = [
    { wch: 14 },
    { wch: 45 },
    { wch: 16 },
    { wch: 14 }
  ];

  additionalIncomeWorksheet['!autofilter'] = {
    ref: 'A1:D1'
  };

  applyTableStyle(additionalIncomeWorksheet, ['C']);
  applyHeaderStyle(additionalIncomeWorksheet, 1, 0, 3);

  if (additionalIncomes.length > 0) {
    const totalRowNumber = additionalIncomeRows.length;
    applyStyle(additionalIncomeWorksheet, `B${totalRowNumber}`, styles.total);
    applyStyle(additionalIncomeWorksheet, `C${totalRowNumber}`, styles.total);
  }

  XLSX.utils.book_append_sheet(workbook, additionalIncomeWorksheet, 'Ingresos adicionales');

  // Hoja 3: Gastos
  const expenseRows = [
    ['Fecha', 'Categoría', 'Descripción', 'Valor', 'Evidencia', 'Origen', 'Fecha de registro']
  ];

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

    expenseRows.push([]);
    expenseRows.push([
      '',
      '',
      'TOTAL GASTOS DEL MES',
      totalExpenses,
      '',
      '',
      ''
    ]);
  } else {
    expenseRows.push([
      '',
      '',
      'No hay gastos registrados para este mes',
      '',
      '',
      '',
      ''
    ]);
  }

  const expensesWorksheet = XLSX.utils.aoa_to_sheet(expenseRows);

  expensesWorksheet['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 45 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 }
  ];

  expensesWorksheet['!autofilter'] = {
    ref: 'A1:G1'
  };

  applyTableStyle(expensesWorksheet, ['D']);
  applyHeaderStyle(expensesWorksheet, 1, 0, 6);

  if (expenses.length > 0) {
    const totalRowNumber = expenseRows.length;
    applyStyle(expensesWorksheet, `C${totalRowNumber}`, styles.total);
    applyStyle(expensesWorksheet, `D${totalRowNumber}`, styles.total);
  }

  XLSX.utils.book_append_sheet(workbook, expensesWorksheet, 'Gastos');

  const fileName = `reporte-mensual-${selectedMonth}.xlsx`;

  XLSX.writeFile(workbook, fileName);

  Swal.fire({
    title: 'Excel generado',
    text: 'El reporte mensual fue descargado correctamente.',
    icon: 'success',
    confirmButtonColor: '#3c0000'
  });
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
      return;
    }

    if (!data.income) {
      currentIncomeAmount = 0;
      incomeAmount.value = '';
      incomeDescription.value = '';
      updateIncomePanel();
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

  if (!amountValue || amountValue < 0) {
    Swal.fire({
      title: 'Ingreso inválido',
      text: 'Ingresa un valor válido para el ingreso mensual.',
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
        title: 'No se pudo guardar',
        text: data.mensaje || 'Ocurrió un error al guardar el ingreso.',
        icon: 'error',
        confirmButtonColor: '#3c0000'
      });
      return;
    }

    currentIncomeAmount = amountValue;
    updateIncomePanel();

    Swal.fire({
      title: 'Ingreso guardado',
      text: 'El ingreso mensual fue guardado correctamente.',
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

  } catch (error) {
    console.error('Error al guardar ingreso:', error);

    Swal.fire({
      title: 'Error',
      text: 'Ocurrió un error al guardar el ingreso mensual.',
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
  const savings = currentIncomeAmount + currentAdditionalIncomeTotal - currentExpensesTotal;

  monthlySavings.textContent = formatMoney(savings);

  monthlySavings.classList.remove('positive-saving', 'negative-saving');

  if (savings >= 0) {
    monthlySavings.classList.add('positive-saving');
  } else {
    monthlySavings.classList.add('negative-saving');
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
      return;
    }

    currentAdditionalIncomes = data.additionalIncomes || [];

    currentAdditionalIncomeTotal = currentAdditionalIncomes.reduce((total, income) => {
      return total + Number(income.amount);
    }, 0);

    renderAdditionalIncomes();
    updateIncomePanel();

  } catch (error) {
    console.error('Error al consultar ingresos adicionales:', error);
  }
}

async function saveAdditionalIncome() {
  const selectedMonth = monthFilter.value || getLocalMonth();

  const additionalIncomeData = {
    month_key: selectedMonth,
    income_date: additionalIncomeDate.value || getLocalDate(),
    description: additionalIncomeDescription.value.trim(),
    amount: Number(additionalIncomeAmount.value),
    source: 'manual'
  };

  if (
    !additionalIncomeData.income_date ||
    !additionalIncomeData.description ||
    !additionalIncomeData.amount ||
    additionalIncomeData.amount <= 0
  ) {
    Swal.fire({
      title: 'Datos incompletos',
      text: 'Completa la fecha, descripción y valor del ingreso adicional.',
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

    if (response.status === 401) {
      await handleUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: isEditing ? 'No se pudo actualizar' : 'No se pudo guardar',
        text: data.mensaje || 'Ocurrió un error al procesar el ingreso adicional.',
        icon: 'error',
        confirmButtonColor: '#3c0000'
      });
      return;
    }

    additionalIncomeDescription.value = '';
    additionalIncomeAmount.value = '';
    additionalIncomeDate.value = getLocalDate();

    editingAdditionalIncomeId = null;
    saveAdditionalIncomeButton.innerHTML = `
      <i class="bi bi-plus-circle"></i>
      Agregar ingreso adicional
    `;

    await loadAdditionalIncomes();

    Swal.fire({
      title: isEditing ? 'Ingreso adicional actualizado' : 'Ingreso adicional guardado',
      text: isEditing
        ? 'El ingreso adicional fue actualizado correctamente.'
        : 'El ingreso adicional fue registrado correctamente.',
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

  } catch (error) {
    console.error('Error al procesar ingreso adicional:', error);

    Swal.fire({
      title: 'Error',
      text: 'Ocurrió un error al procesar el ingreso adicional.',
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

async function deleteAdditionalIncome(additionalIncomeId) {
  const result = await Swal.fire({
    title: '¿Eliminar ingreso adicional?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3c0000',
    cancelButtonColor: '#6b7280'
  });

  if (!result.isConfirmed) {
    return;
  }

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
        title: 'No se pudo eliminar',
        text: data.mensaje || 'Ocurrió un error al eliminar el ingreso adicional.',
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
        Agregar ingreso adicional
      `;
    }

    await loadAdditionalIncomes();

    Swal.fire({
      title: 'Ingreso adicional eliminado',
      text: 'El ingreso adicional fue eliminado correctamente.',
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });

  } catch (error) {
    console.error('Error al eliminar ingreso adicional:', error);

    Swal.fire({
      title: 'Error',
      text: 'Ocurrió un error al eliminar el ingreso adicional.',
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}


function renderAdditionalIncomes() {
  if (!currentAdditionalIncomes || currentAdditionalIncomes.length === 0) {
    additionalIncomesList.innerHTML = `
      <p class="empty-additional-income">
        No hay ingresos adicionales registrados para este mes.
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
         Actualizar ingreso
        `;

        Swal.fire({
            icon: 'info',
            title: 'Editar ingreso adicional',
            text: 'Los datos se cargaron en el formulario. Modifica la información y presiona Actualizar ingreso.',
            confirmButtonText: 'Entendido'
    });
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
      labels: ['Ingresos', 'Gastos', 'Ahorro'],
      datasets: [
        {
          label: 'Resumen del mes',
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

  const labels = Object.keys(dailyTotals).map((day) => `Día ${day}`);
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

document.addEventListener('DOMContentLoaded', () => {
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
        expenseEvidenceName.textContent = 'Ningún archivo seleccionado';
      }
    });
  }

  loadExpenses();
  loadMonthlyIncome();
  loadAdditionalIncomes();

  expenseForm.addEventListener('submit', saveExpense);
  cancelEditButton.addEventListener('click', resetFormMode);

  monthFilter.addEventListener('change', async () => {
    applyMonthFilter();
    await loadMonthlyIncome();
    await loadAdditionalIncomes();
  });

  voiceButton.addEventListener('click', startVoiceExpense);
  downloadExcelButton.addEventListener('click', downloadExpensesExcel);
  saveIncomeButton.addEventListener('click', saveMonthlyIncome);
  saveAdditionalIncomeButton.addEventListener('click', saveAdditionalIncome);
});