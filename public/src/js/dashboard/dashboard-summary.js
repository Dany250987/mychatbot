// ===============================
// Seguridad con token para el resumen del dashboard
// ===============================

function getDashboardSummaryAuthToken() {
  return localStorage.getItem("authToken");
}

function getDashboardSummaryAuthHeaders() {
  const token = getDashboardSummaryAuthToken();

  return {
    Authorization: `Bearer ${token}`
  };
}

async function parseDashboardSummaryJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function handleDashboardSummaryUnauthorizedSession(data) {
  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");

  const message = data?.error || data?.mensaje || "Tu sesión venció o no es válida. Inicia sesión nuevamente.";

  if (typeof Swal !== "undefined") {
    await Swal.fire({
      title: "Sesión vencida",
      text: message,
      icon: "warning",
      confirmButtonColor: "#960018"
    });
  } else {
    alert(message);
  }

  window.location.href = "login_google.html";
}


// ===============================
// Contadores de tareas
// ===============================

function updateDashboardTasksCount() {
  const totalTasksCount = document.getElementById("totalTasksCount");
  const pendingTasksCount = document.getElementById("pendingTasksCount");

  const pendingTasks = tasks.filter((task) => {
    return task.status === "pendiente";
  }).length;

  if (totalTasksCount) {
    totalTasksCount.textContent = tasks.length;
  }

  if (pendingTasksCount) {
    pendingTasksCount.textContent = pendingTasks;
  }
}


// ===============================
// Contadores de recordatorios
// ===============================

function updateDashboardRemindersCount() {
  const activeRemindersCount = document.getElementById("activeRemindersCount");

  if (!activeRemindersCount) {
    return;
  }

  const activeReminders = reminders.filter((reminder) => {
    return reminder.status === "activo";
  });

  activeRemindersCount.textContent = activeReminders.length;
}

function updateDashboardTodayEventsCount() {
  const todayEventsCount = document.getElementById("todayEventsCount");

  if (!todayEventsCount) {
    return;
  }

  const today = getTodayDate();

  const todayReminders = reminders.filter((reminder) => {
    return getReminderDateValue(reminder.reminder_date) === today
      && reminder.status === "activo";
  });

  todayEventsCount.textContent = todayReminders.length;
}


// ===============================
// Cargar tareas del dashboard
// ===============================

async function loadDashboardTasksCount() {
  const token = getDashboardSummaryAuthToken();

  if (!token) {
    await handleDashboardSummaryUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(TASKS_API_URL, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const data = await parseDashboardSummaryJsonResponse(response);

    if (response.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      console.error("No se pudieron cargar las tareas del dashboard:", data);
      updateDashboardTasksCount();
      return;
    }

    tasks = (data.tareas || []).map((task) => {
      return {
        id: task.id,
        user_id: task.user_id,
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        dueDate: task.due_date ? String(task.due_date).split("T")[0] : "",
        status: task.status,
        completedAt: task.completed_at || null
      };
    });

    updateDashboardTasksCount();

  } catch (error) {
    console.error("Error al cargar el contador de tareas:", error);
    updateDashboardTasksCount();
  }
}


// ===============================
// Cargar recordatorios del dashboard
// ===============================

async function loadDashboardRemindersCount() {
  const token = getDashboardSummaryAuthToken();

  if (!token) {
    await handleDashboardSummaryUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(REMINDERS_API_URL, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const data = await parseDashboardSummaryJsonResponse(response);

    if (response.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      console.error("No se pudieron cargar los recordatorios del dashboard:", data);
      updateDashboardRemindersCount();
      updateDashboardTodayEventsCount();
      return;
    }

    reminders = data.reminders || [];

    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();

  } catch (error) {
    console.error("Error al cargar el contador de recordatorios:", error);
    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();
  }
}


// ===============================
// Tarjetas financieras
// ===============================

function updateDashboardFinancialCards(monthlyExpenses, monthlyIncome, monthlySavings) {
  const monthlyExpensesAmount = document.getElementById("monthlyExpensesAmount");
  const monthlyIncomeAmount = document.getElementById("monthlyIncomeAmount");
  const monthlySavingsAmount = document.getElementById("monthlySavingsAmount");

  if (monthlyExpensesAmount) {
    monthlyExpensesAmount.textContent = formatDashboardMoney(monthlyExpenses);
  }

  if (monthlyIncomeAmount) {
    monthlyIncomeAmount.textContent = formatDashboardMoney(monthlyIncome);
  }

  if (monthlySavingsAmount) {
    monthlySavingsAmount.textContent = formatDashboardMoney(monthlySavings);

    monthlySavingsAmount.classList.remove("positive-saving", "negative-saving");

    if (monthlySavings >= 0) {
      monthlySavingsAmount.classList.add("positive-saving");
    } else {
      monthlySavingsAmount.classList.add("negative-saving");
    }
  }
}


// ===============================
// Cargar resumen financiero del dashboard
// ===============================

async function loadDashboardFinancialSummary() {
  const token = getDashboardSummaryAuthToken();

  if (!token) {
    await handleDashboardSummaryUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  const selectedMonth = getCurrentMonthKey();

  let monthlyExpenses = 0;
  let mainIncome = 0;
  let additionalIncome = 0;

  try {
    const expensesResponse = await fetch(EXPENSES_API_URL, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const expensesData = await parseDashboardSummaryJsonResponse(expensesResponse);

    if (expensesResponse.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(expensesData);
      return;
    }

    if (expensesResponse.ok) {
      const expenses = expensesData.gastos || [];

      const currentMonthExpenses = expenses.filter((expense) => {
        const expenseDate = String(expense.expense_date).split("T")[0];
        const expenseMonth = expenseDate.slice(0, 7);

        return expenseMonth === selectedMonth;
      });

      monthlyExpenses = currentMonthExpenses.reduce((total, expense) => {
        return total + Number(expense.amount || 0);
      }, 0);
    } else {
      console.error("No se pudieron cargar gastos del dashboard:", expensesData);
    }

  } catch (error) {
    console.error("Error al cargar gastos del dashboard:", error);
  }

  try {
    const incomeResponse = await fetch(`${INCOMES_API_URL}?month=${selectedMonth}`, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const incomeData = await parseDashboardSummaryJsonResponse(incomeResponse);

    if (incomeResponse.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(incomeData);
      return;
    }

    if (incomeResponse.ok && incomeData.income) {
      mainIncome = Number(incomeData.income.amount || 0);
    } else {
      console.error("No se pudo cargar ingreso principal del dashboard:", incomeData);
    }

  } catch (error) {
    console.error("Error al cargar ingreso mensual del dashboard:", error);
  }

  try {
    const additionalIncomeResponse = await fetch(`${INCOMES_API_URL}/additional?month=${selectedMonth}`, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const additionalIncomeData = await parseDashboardSummaryJsonResponse(additionalIncomeResponse);

    if (additionalIncomeResponse.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(additionalIncomeData);
      return;
    }

    if (additionalIncomeResponse.ok) {
      const additionalIncomes = additionalIncomeData.additionalIncomes || [];

      additionalIncome = additionalIncomes.reduce((total, income) => {
        return total + Number(income.amount || 0);
      }, 0);
    } else {
      console.error("No se pudieron cargar ingresos adicionales del dashboard:", additionalIncomeData);
    }

  } catch (error) {
    console.error("Error al cargar ingresos adicionales del dashboard:", error);
  }

  const totalIncome = mainIncome + additionalIncome;
  const monthlySavings = totalIncome - monthlyExpenses;

  updateDashboardFinancialCards(monthlyExpenses, totalIncome, monthlySavings);
}