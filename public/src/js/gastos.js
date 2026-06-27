// Usuario temporal para pruebas.
// Más adelante este valor debe salir del usuario que inició sesión.
// Obtenemos los datos del usuario que inició sesión
const userData = localStorage.getItem("userData");

// Si no hay sesión activa, redirigimos al login
if (!userData) {
  alert("⚠️ Sesión no iniciada. Por favor, inicia sesión.");
  window.location.href = "login_google_chatbot.html";
}

// Convertimos el texto guardado en localStorage a un objeto JavaScript
const user = JSON.parse(userData);

// Tomamos el id real del usuario logueado
const USER_ID = user.id;

// Ruta base del backend para gastos.
const API_URL = '/api/expenses';

// Tomamos los elementos del HTML que vamos a usar.
const expenseForm = document.getElementById('expenseForm');
const expenseDate = document.getElementById('expenseDate');
const category = document.getElementById('category');
const description = document.getElementById('description');
const amount = document.getElementById('amount');
const source = document.getElementById('source');
const expenseId = document.getElementById('expenseId');
const submitExpenseButton = document.getElementById('submitExpenseButton');
const cancelEditButton = document.getElementById('cancelEditButton');

const expensesTableBody = document.getElementById('expensesTableBody');
const monthlyTotal = document.getElementById('monthlyTotal');
const expenseMessage = document.getElementById('expenseMessage');
const monthFilter = document.getElementById('monthFilter');
let currentExpenses = [];


// Esta función consulta los gastos desde el backend.
async function loadExpenses() {
  try {
    const response = await fetch(`${API_URL}?user_id=${USER_ID}`);
    const data = await response.json();

    if (!response.ok) {
      expenseMessage.textContent = data.mensaje || 'Error al consultar los gastos';
      return;
    }

    currentExpenses = data.gastos;

    applyMonthFilter();

  } catch (error) {
    console.error('Error al cargar gastos:', error);
    expenseMessage.textContent = 'No fue posible cargar los gastos';
  }
}


// Esta función guarda un gasto nuevo en la base de datos.
async function saveExpense(event) {
  event.preventDefault();

  const newExpense = {
    user_id: USER_ID,
    expense_date: expenseDate.value,
    category: category.value,
    description: description.value,
    amount: Number(amount.value),
    source: source.value || 'manual'
  };

  const editingId = expenseId.value;

  if (
    !newExpense.expense_date ||
    !newExpense.category ||
    !newExpense.description ||
    !newExpense.amount
  ) {
    expenseMessage.textContent = 'Por favor completa todos los campos.';
    return;
  }

  try {
    const url = editingId ? `${API_URL}/${editingId}` : API_URL;
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
        method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newExpense)
    });

    const data = await response.json();

    if (!response.ok) {
      expenseMessage.textContent = data.mensaje || 'No se pudo guardar el gasto.';
      return;
    }

    expenseMessage.textContent = editingId
        ? '✅ Gasto actualizado correctamente.'
        : '✅ Gasto guardado correctamente.';

        resetFormMode();

    // Volvemos a consultar para actualizar la tabla y el total.
    loadExpenses();

  } catch (error) {
    console.error('Error al guardar gasto:', error);
    expenseMessage.textContent = 'Ocurrió un error al guardar el gasto.';
  }
}

// Esta función filtra los gastos según el mes seleccionado.
function applyMonthFilter() {
  const selectedMonth = monthFilter.value;

  if (!selectedMonth) {
    showExpenses(currentExpenses);
    calculateMonthlyTotal(currentExpenses);
    return;
  }

  const filteredExpenses = currentExpenses.filter((expense) => {
    const expenseMonth = formatDateForInput(expense.expense_date).slice(0, 7);
    return expenseMonth === selectedMonth;
  });

  showExpenses(filteredExpenses);
  calculateMonthlyTotal(filteredExpenses);
}


// Esta función pinta los gastos en la tabla.
function showExpenses(expenses) {
  expensesTableBody.innerHTML = '';

  if (expenses.length === 0) {
    expensesTableBody.innerHTML = `
        <tr>
            <td colspan="6">No tienes gastos registrados.</td>
        </tr>
        `;
    return;
  }

  expenses.forEach((expense) => {
    const row = document.createElement('tr');

    row.innerHTML = `
        <td>${formatDate(expense.expense_date)}</td>
        <td>${expense.category}</td>
        <td>${expense.description}</td>
        <td>${formatMoney(expense.amount)}</td>
        <td>${expense.source}</td>
        <td>
            <button type="button" onclick="startEditExpense(${expense.id})">
                Editar
            </button>

            <button type="button" onclick="deleteExpense(${expense.id})">
                Eliminar
            </button>
        </td>
        `;

    expensesTableBody.appendChild(row);
  });
}


// Esta función calcula el total de los gastos que se están mostrando.
function calculateMonthlyTotal(expenses) {
  let total = 0;

  expenses.forEach((expense) => {
    total += Number(expense.amount);
  });

  monthlyTotal.textContent = formatMoney(total);
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
  const [year, month, day] = cleanDate.split('-');

  return `${day}/${month}/${year}`;
}

// Esta función convierte la fecha al formato que necesita el input type="date".
function formatDateForInput(dateValue) {
  return dateValue.split('T')[0];
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

  submitExpenseButton.textContent = 'Actualizar gasto';
  cancelEditButton.style.display = 'block';

  expenseMessage.textContent = 'Editando gasto seleccionado.';
}

// Esta función elimina un gasto desde la pantalla.
async function deleteExpense(expenseId) {
  const confirmDelete = confirm('¿Seguro que deseas eliminar este gasto?');

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${expenseId}?user_id=${USER_ID}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      expenseMessage.textContent = data.mensaje || 'No se pudo eliminar el gasto.';
      return;
    }

    expenseMessage.textContent = '✅ Gasto eliminado correctamente.';

    loadExpenses();

  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    expenseMessage.textContent = 'Ocurrió un error al eliminar el gasto.';
  }
}

// Esta función limpia el formulario y vuelve al modo crear.
function resetFormMode() {
  expenseForm.reset();

  expenseId.value = '';
  source.value = 'manual';

  submitExpenseButton.textContent = 'Guardar gasto';
  cancelEditButton.style.display = 'none';

  setTodayDate();
}

document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  setCurrentMonthFilter();
  loadExpenses();

  expenseForm.addEventListener('submit', saveExpense);
  cancelEditButton.addEventListener('click', resetFormMode);
  monthFilter.addEventListener('change', applyMonthFilter);
});